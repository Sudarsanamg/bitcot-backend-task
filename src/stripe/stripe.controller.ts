import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

  @Post('checkout')
  async checkout(@Body() body: { email: string }) {
    const session = await this.stripeService.createCheckoutSession(
      body.email,
    );

    return {
      checkoutUrl: session.url,
    };
  }

  @Post('webhook')
  async webhook(
    @Req() request: Request & { body: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    return this.stripeWebhookService.handleWebhook(request.body, signature);
  }
}