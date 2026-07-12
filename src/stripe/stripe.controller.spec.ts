import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

describe('StripeController', () => {
  let controller: StripeController;
  let stripeWebhookService: { handleWebhook: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        {
          provide: StripeService,
          useValue: {
            createCheckoutSession: jest.fn(),
          },
        },
        {
          provide: StripeWebhookService,
          useValue: {
            handleWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
    stripeWebhookService = module.get(StripeWebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards the raw webhook payload and signature to the webhook service', async () => {
    const body = Buffer.from('stripe-payload');
    stripeWebhookService.handleWebhook.mockResolvedValue({ received: true });

    const result = await controller.webhook(
      { body } as any,
      'whsec_test_signature',
    );

    expect(stripeWebhookService.handleWebhook).toHaveBeenCalledWith(
      body,
      'whsec_test_signature',
    );
    expect(result).toEqual({ received: true });
  });
});
