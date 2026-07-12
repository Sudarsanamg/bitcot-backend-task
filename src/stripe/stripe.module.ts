import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, InvoiceModule, EmailModule],
  providers: [StripeService, StripeWebhookService],
  controllers: [StripeController],
})
export class StripeModule {}
