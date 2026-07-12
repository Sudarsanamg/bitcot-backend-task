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