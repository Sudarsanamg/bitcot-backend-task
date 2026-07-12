import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  BillingInterval,
  PaymentProvider,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

type StoredSubscription = {
  status: SubscriptionStatus;
  startDate: Date;
  expiryDate: Date;
};

type CheckoutSessionCompleted = Stripe.Checkout.Session & {
  payment_intent: string | Stripe.PaymentIntent | null;
  customer: string | Stripe.Customer | null;
  subscription: string | Stripe.Subscription | null;
  amount_total: number | null;
  payment_method_types?: string[];
};

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async handleWebhook(payload: Buffer, signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    const event = this.stripeService.constructWebhookEvent(payload, signature);

    if (event.type !== 'checkout.session.completed') {
      this.logger.debug(`Ignoring unsupported Stripe event type: ${event.type}`);
      return { received: true };
    }

    const session = event.data.object as CheckoutSessionCompleted;
    const extracted = this.extractCompletedCheckoutSession(session);

    const paymentAlreadyProcessed = await this.prisma.order.findFirst({
      where: {
        OR: [
          { providerCheckoutSessionId: extracted.checkoutSessionId },
          ...(extracted.paymentIntentId
            ? [{ providerPaymentIntentId: extracted.paymentIntentId }]
            : []),
        ],
      },
    });

    if (paymentAlreadyProcessed) {
      this.logger.warn(
        `Duplicate payment ignored for session ${extracted.checkoutSessionId}`,
      );
      return { received: true };
    }

    const subscription = await this.stripeService.retrieveSubscription(
      extracted.subscriptionId,
    );
    const paymentDate = new Date();

    await this.prisma.$transaction(async (tx) => {
      // The webhook event is written first so the same Stripe event id cannot be applied twice.
      await tx.webhookEvent.create({
        data: {
          paymentProvider: PaymentProvider.STRIPE,
          eventId: event.id,
          eventType: event.type,
          providerCheckoutSessionId: extracted.checkoutSessionId,
          providerCustomerId: extracted.customerId,
          providerSubscriptionId: extracted.subscriptionId,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      });

      const alreadyProcessed = await tx.order.findFirst({
        where: {
          OR: [
            { providerCheckoutSessionId: extracted.checkoutSessionId },
            ...(extracted.paymentIntentId
              ? [{ providerPaymentIntentId: extracted.paymentIntentId }]
              : []),
          ],
        },
      });

      if (alreadyProcessed) {
        this.logger.warn(
          `Duplicate payment ignored for session ${extracted.checkoutSessionId}`,
        );
        return;
      }

      // Email is the user natural key, so upsert prevents duplicate users.
      const user = await tx.user.upsert({
        where: { email: extracted.customerEmail },
        update: {},
        create: {
          email: extracted.customerEmail,
        },
      });

      const existingSubscription = (await tx.subscription.findUnique({
        where: { userId: user.id },
      })) as StoredSubscription | null;

      const subscriptionSnapshot = this.buildSubscriptionSnapshot(
        extracted,
        subscription,
        existingSubscription,
        paymentDate,
      );

      await tx.subscription.upsert({
        where: { userId: user.id },
        update: subscriptionSnapshot,
        create: {
          userId: user.id,
          ...subscriptionSnapshot,
        },
      });

      await tx.order.create({
        data: {
          paymentProvider: PaymentProvider.STRIPE,
          providerCheckoutSessionId: extracted.checkoutSessionId,
          providerPaymentIntentId: extracted.paymentIntentId,
          providerCustomerId: extracted.customerId,
          providerSubscriptionId: extracted.subscriptionId,
          amount: extracted.amountPaid,
          currency: extracted.currency,
          paymentStatus: extracted.paymentStatus,
          paymentMethodType: extracted.paymentMethodType,
          userId: user.id,
        },
      });
    }).catch((error: unknown) => {
      if (this.isDuplicateWebhookError(error)) {
        this.logger.warn(`Duplicate webhook ignored: ${event.id}`);
        return;
      }

      throw error;
    });

    this.logger.log(
      `Processed checkout.session.completed for session ${extracted.checkoutSessionId}`,
    );

    return { received: true };
  }

  private extractCompletedCheckoutSession(session: CheckoutSessionCompleted) {
    const customerEmail =
      session.customer_details?.email ?? session.customer_email ?? null;
    const stripeCustomerId = this.normalizeStripeId(session.customer);
    const stripeSubscriptionId = this.normalizeStripeId(session.subscription);
    const paymentIntentId = this.normalizeStripeId(session.payment_intent);
    const checkoutSessionId = session.id;

    if (!customerEmail) {
      throw new BadRequestException('Stripe checkout session is missing customer email');
    }

    if (!stripeCustomerId) {
      throw new BadRequestException('Stripe checkout session is missing customer id');
    }

    if (!stripeSubscriptionId) {
      throw new BadRequestException('Stripe checkout session is missing subscription id');
    }

    return {
      customerEmail,
      customerId: stripeCustomerId,
      subscriptionId: stripeSubscriptionId,
      checkoutSessionId,
      paymentIntentId,
      paymentStatus: session.payment_status,
      amountPaid: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      paymentMethodType: session.payment_method_types?.[0] ?? null,
    };
  }

  private buildSubscriptionSnapshot(
    extracted: ReturnType<StripeWebhookService['extractCompletedCheckoutSession']>,
    subscription: Awaited<ReturnType<StripeService['retrieveSubscription']>>,
    existingSubscription: StoredSubscription | null,
    paymentDate: Date,
  ) {
    const subscriptionItem = subscription.items.data[0];
    const price = subscriptionItem?.price;

    if (!price) {
      throw new BadRequestException('Stripe subscription does not include a price');
    }

    const recurringInterval = price.recurring?.interval;
    const billingInterval = this.mapBillingInterval(recurringInterval);
    const productId = typeof price.product === 'string' ? price.product : price.product.id;
    // The current expiry date is the renewal source of truth.
    // If the subscription has not expired yet, extend from that saved expiry
    // so a second payment never recreates the same 30-day window.
    const shouldExtendFromExpiry =
      existingSubscription !== null &&
      existingSubscription.expiryDate > paymentDate;
    const renewalAnchorDate = shouldExtendFromExpiry
      ? existingSubscription.expiryDate
      : paymentDate;
    const nextExpiryDate = this.addBillingInterval(
      renewalAnchorDate,
      billingInterval,
    );

    // When a subscription is still active, extend from its current expiry date so the user
    // never loses prepaid time by renewing early.
    const startDate = shouldExtendFromExpiry
      ? existingSubscription.startDate
      : paymentDate;

    return {
      paymentProvider: PaymentProvider.STRIPE,
      providerSubscriptionId: extracted.subscriptionId,
      providerCustomerId: extracted.customerId,
      status: this.mapSubscriptionStatus(subscription.status),
      plan: typeof price.product === 'string' ? price.product : price.product.name ?? price.id,
      billingInterval,
      providerPriceId: price.id,
      providerProductId: productId,
      startDate,
      expiryDate: nextExpiryDate,
      currentPeriodStart: renewalAnchorDate,
      currentPeriodEnd: nextExpiryDate,
      latestCheckoutSessionId: extracted.checkoutSessionId,
      latestPaymentStatus: extracted.paymentStatus,
    };
  }

  private addBillingInterval(baseDate: Date, interval: BillingInterval) {
    const expiration = new Date(baseDate.getTime());

    if (interval === BillingInterval.MONTHLY) {
      expiration.setDate(expiration.getDate() + 30);
      return expiration;
    }

    if (interval === BillingInterval.YEARLY) {
      expiration.setDate(expiration.getDate() + 365);
      return expiration;
    }

    throw new BadRequestException(`Unsupported billing interval: ${interval}`);
  }

  private mapBillingInterval(interval?: Stripe.Price.Recurring.Interval) {
    if (interval === 'month') {
      return BillingInterval.MONTHLY;
    }

    if (interval === 'year') {
      return BillingInterval.YEARLY;
    }

    throw new BadRequestException(
      `Unsupported billing interval: ${interval ?? 'unknown'}`,
    );
  }

  private mapSubscriptionStatus(status: string): SubscriptionStatus {
    const normalizedStatus = status.toUpperCase().replace(/-/g, '_');

    if (normalizedStatus in SubscriptionStatus) {
      return normalizedStatus as SubscriptionStatus;
    }

    throw new BadRequestException(`Unsupported subscription status: ${status}`);
  }

  private normalizeStripeId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.PaymentIntent | null) {
    return typeof value === 'string' ? value : value?.id ?? null;
  }

  private isDuplicateWebhookError(error: unknown) {
    return typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002';
  }
}