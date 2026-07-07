import { Body, Controller, Post } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  async checkout(@Body() body: { email: string }) {
    const session = await this.stripeService.createCheckoutSession(
      body.email,
    );

    return {
      checkoutUrl: session.url,
    };
  }
}