import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { BillingInterval, PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

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
    const subscription = await this.stripeService.retrieveSubscription(
      extracted.subscriptionId,
    );

    await this.prisma.$transaction(async (tx) => {
      // The webhook event is written first so repeated deliveries fail fast on the unique event id.
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

      const user = await tx.user.upsert({
        where: { email: extracted.customerEmail },
        update: {},
        create: {
          email: extracted.customerEmail,
        },
      });

      const subscriptionSnapshot = this.buildSubscriptionSnapshot(
        extracted,
        subscription,
      );

      await tx.subscription.upsert({
        where: { userId: user.id },
        update: subscriptionSnapshot,
        create: {
          userId: user.id,
          ...subscriptionSnapshot,
        },
      });

      await tx.order.upsert({
        where: { providerCheckoutSessionId: extracted.checkoutSessionId },
        update: {
          paymentProvider: PaymentProvider.STRIPE,
          providerPaymentIntentId: extracted.paymentIntentId,
          providerCustomerId: extracted.customerId,
          providerSubscriptionId: extracted.subscriptionId,
          amount: extracted.amountPaid,
          currency: extracted.currency,
          paymentStatus: extracted.paymentStatus,
          paymentMethodType: extracted.paymentMethodType,
        },
        create: {
          userId: user.id,
          paymentProvider: PaymentProvider.STRIPE,
          providerCheckoutSessionId: extracted.checkoutSessionId,
          providerPaymentIntentId: extracted.paymentIntentId,
          providerCustomerId: extracted.customerId,
          providerSubscriptionId: extracted.subscriptionId,
          amount: extracted.amountPaid,
          currency: extracted.currency,
          paymentStatus: extracted.paymentStatus,
          paymentMethodType: extracted.paymentMethodType,
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
  ) {
    const subscriptionItem = subscription.items.data[0];
    const price = subscriptionItem?.price;

    if (!price) {
      throw new BadRequestException('Stripe subscription does not include a price');
    }

    const recurringInterval = price.recurring?.interval;
    const billingInterval = this.mapBillingInterval(recurringInterval);
    const productId = typeof price.product === 'string' ? price.product : price.product.id;

    return {
      paymentProvider: PaymentProvider.STRIPE,
      providerSubscriptionId: extracted.subscriptionId,
      providerCustomerId: extracted.customerId,
      status: subscription.status,
      plan: typeof price.product === 'string' ? price.product : price.product.name ?? price.id,
      billingInterval,
      providerPriceId: price.id,
      providerProductId: productId,
      startDate: this.toStripeDate(subscription.start_date, 'startDate'),
      expiryDate: this.toStripeDate(
        this.getSubscriptionTimestamp(subscription, subscriptionItem, 'current_period_end'),
        'expiryDate',
      ),
      currentPeriodStart: this.toStripeDate(
        this.getSubscriptionTimestamp(subscription, subscriptionItem, 'current_period_start'),
        'currentPeriodStart',
      ),
      currentPeriodEnd: this.toStripeDate(
        this.getSubscriptionTimestamp(subscription, subscriptionItem, 'current_period_end'),
        'currentPeriodEnd',
      ),
      latestCheckoutSessionId: extracted.checkoutSessionId,
      latestPaymentStatus: extracted.paymentStatus,
    };
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

  private normalizeStripeId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.PaymentIntent | null) {
    return typeof value === 'string' ? value : value?.id ?? null;
  }

  private getSubscriptionTimestamp(
    subscription: Stripe.Subscription,
    subscriptionItem:
      | (Stripe.Subscription['items']['data'][number] & {
          current_period_start?: number;
          current_period_end?: number;
        })
      | undefined,
    field: 'current_period_start' | 'current_period_end',
  ) {
    const itemTimestamp = subscriptionItem?.[field];
    if (typeof itemTimestamp === 'number') {
      return itemTimestamp;
    }

    const topLevelTimestamp = (subscription as Stripe.Subscription & Partial<Record<typeof field, number>>)[field];
    if (typeof topLevelTimestamp === 'number') {
      return topLevelTimestamp;
    }

    throw new BadRequestException(
      `Stripe subscription is missing ${field.replace('_', ' ')} timestamp`,
    );
  }

  private toStripeDate(timestamp: unknown, label: string) {
    const normalizedTimestamp = Number(timestamp);

    if (!Number.isFinite(normalizedTimestamp) || normalizedTimestamp <= 0) {
      throw new BadRequestException(`Stripe subscription is missing ${label} timestamp`);
    }

    const date = new Date(normalizedTimestamp * 1000);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Stripe produced an invalid ${label}`);
    }

    return date;
  }

  private isDuplicateWebhookError(error: unknown) {
    return typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002';
  }
}