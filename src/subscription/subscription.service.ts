import { Injectable } from '@nestjs/common';
import { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RenewalReminderCandidate {
  subscriptionId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  plan: string;
  billingInterval: string;
  expiryDate: Date;
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findRenewalReminderCandidates(
    referenceDate = new Date(),
    daysAhead = 3,
  ): Promise<RenewalReminderCandidate[]> {
    const expiryWindowEnd = new Date(referenceDate.getTime());
    expiryWindowEnd.setDate(expiryWindowEnd.getDate() + daysAhead);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiryDate: {
          gte: referenceDate,
          lte: expiryWindowEnd,
        },
      },
      select: {
        id: true,
        userId: true,
        plan: true,
        billingInterval: true,
        expiryDate: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return subscriptions.map((subscription) => ({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      customerName: this.deriveCustomerName(subscription.user.email),
      customerEmail: subscription.user.email,
      plan: subscription.plan,
      billingInterval: this.formatBillingInterval(subscription.billingInterval),
      expiryDate: subscription.expiryDate,
    }));
  }

  private deriveCustomerName(email: string) {
    const localPart = email.split('@')[0] ?? email;

    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatBillingInterval(interval: BillingInterval) {
    return interval.toLowerCase();
  }
}