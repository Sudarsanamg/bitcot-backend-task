export class PrismaClient {
  async $connect() {
    return undefined;
  }

  async $disconnect() {
    return undefined;
  }

  async $transaction<T>(callback: (client: PrismaClient) => Promise<T>) {
    return callback(this);
  }
}

export const Prisma = {};

export const BillingInterval = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export const PaymentProvider = {
  STRIPE: 'STRIPE',
} as const;

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  TRIALING: 'TRIALING',
  INCOMPLETE: 'INCOMPLETE',
  INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  UNPAID: 'UNPAID',
  PAUSED: 'PAUSED',
} as const;