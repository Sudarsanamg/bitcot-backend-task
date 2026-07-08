import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

describe('StripeWebhookService', () => {
  it('rejects checkout sessions when Stripe subscription timestamps are missing', async () => {
    const prismaMock = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) => {
        const tx = {
          webhookEvent: { create: jest.fn() },
          user: { upsert: jest.fn() },
          subscription: { upsert: jest.fn() },
          order: { upsert: jest.fn() },
        };

        return callback(tx);
      }),
    } as unknown as PrismaService;

    const stripeServiceMock = {
      constructWebhookEvent: jest.fn(() => ({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer_details: { email: 'test@example.com' },
            customer: 'cus_123',
            subscription: 'sub_123',
            payment_intent: 'pi_123',
            payment_status: 'paid',
            amount_total: 1000,
            currency: 'usd',
          },
        },
      })),
      retrieveSubscription: jest.fn(() =>
        Promise.resolve({
          id: 'sub_123',
          status: 'active',
          start_date: undefined,
          items: {
            data: [
              {
                price: {
                  id: 'price_123',
                  recurring: { interval: 'month' },
                  product: { id: 'prod_123', name: 'Pro Subscription' },
                },
              },
            ],
          },
        } as any),
      ),
    } as unknown as StripeService;

    const service = new StripeWebhookService(prismaMock, stripeServiceMock);

    await expect(service.handleWebhook(Buffer.from('payload'), 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});