import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { RedisCacheService } from '../cache/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ActiveSubscribersResponse {
  count: number;
}

export interface RevenueTotalsResponse {
  totalRevenue: number;
  currencyCode: string;
}

export interface PlatformSummaryResponse {
  activeSubscribers: number;
  totalRevenue: number;
  currencyCode: string;
  totalSubscriptions: number;
  expiredSubscriptions: number;
}

const ANALYTICS_CACHE_TTL_SECONDS = 60;
const ACTIVE_SUBSCRIBERS_CACHE_KEY = 'analytics:active-subscribers';
const REVENUE_TOTALS_CACHE_KEY = 'analytics:revenue-totals';
const PLATFORM_SUMMARY_CACHE_KEY = 'analytics:platform-summary';
const PAISE_PER_RUPEE = 100;
const CURRENCY_CODE = 'INR';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async getActiveSubscribers(): Promise<ActiveSubscribersResponse> {
    return this.cache.getOrSetJson(
      ACTIVE_SUBSCRIBERS_CACHE_KEY,
      ANALYTICS_CACHE_TTL_SECONDS,
      async () => {
        const count = await this.prisma.subscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
          },
        });

        return { count };
      },
    );
  }

  async getRevenueTotals(): Promise<RevenueTotalsResponse> {
    return this.cache.getOrSetJson(
      REVENUE_TOTALS_CACHE_KEY,
      ANALYTICS_CACHE_TTL_SECONDS,
      async () => {
        const revenue = await this.prisma.order.aggregate({
          _sum: {
            amount: true,
          },
        });

        return {
          totalRevenue: this.convertPaiseToRupees(revenue._sum.amount ?? 0),
          currencyCode: CURRENCY_CODE,
        };
      },
    );
  }

  async getPlatformSummary(): Promise<PlatformSummaryResponse> {
    return this.cache.getOrSetJson(
      PLATFORM_SUMMARY_CACHE_KEY,
      ANALYTICS_CACHE_TTL_SECONDS,
      async () => {
        const now = new Date();

        const [activeSubscribers, revenueTotals, totalSubscriptions, expiredSubscriptions] =
          await Promise.all([
            this.prisma.subscription.count({
              where: {
                status: SubscriptionStatus.ACTIVE,
              },
            }),
            this.prisma.order.aggregate({
              _sum: {
                amount: true,
              },
            }),
            this.prisma.subscription.count(),
            this.prisma.subscription.count({
              where: {
                expiresAt: {
                  lt: now,
                },
              },
            }),
          ]);

        return {
          activeSubscribers,
          totalRevenue: this.convertPaiseToRupees(revenueTotals._sum.amount ?? 0),
          currencyCode: CURRENCY_CODE,
          totalSubscriptions,
          expiredSubscriptions,
        };
      },
    );
  }

  private convertPaiseToRupees(amountInPaise: number) {
    return amountInPaise / PAISE_PER_RUPEE;
  }
}