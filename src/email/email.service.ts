import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { basename } from 'path';
import {
  subscriptionSuccessTemplate,
  type SubscriptionSuccessTemplateData,
} from './templates/subscription-success.template';

export interface SendInvoiceEmailInput {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  invoiceFilePath: string;
  subscriptionPlan: string;
  billingInterval: string;
  paymentStatus: string;
  paymentProvider: string;
  subscriptionStartDate: Date;
  subscriptionExpiryDate: Date;
  paymentDate: Date;
}

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly mailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.getRequiredEnv('MAIL_HOST');
    const port = Number(this.getRequiredEnv('MAIL_PORT'));
    const user = this.getRequiredEnv('MAIL_USER');
    const password = this.getRequiredEnv('MAIL_PASSWORD');

    this.mailFrom = this.getRequiredEnv('MAIL_FROM');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password,
      },
    });
  }

  async sendSubscriptionConfirmationEmail(
    input: SendInvoiceEmailInput,
  ): Promise<void> {
    const templateData = this.buildTemplateData(input);
    const html = subscriptionSuccessTemplate(templateData);

    await this.transporter.sendMail({
      from: this.mailFrom,
      to: input.customerEmail,
      subject: 'Subscription Activated Successfully',
      text: this.buildPlainTextBody(input),
      html,
      attachments: [
        {
          filename: basename(input.invoiceFilePath),
          path: input.invoiceFilePath,
        },
      ],
    });
  }

  private buildTemplateData(
    input: SendInvoiceEmailInput,
  ): SubscriptionSuccessTemplateData {
    return {
      customerName: input.customerName,
      subscriptionPlan: input.subscriptionPlan,
      billingInterval: input.billingInterval,
      paymentStatus: input.paymentStatus,
      subscriptionExpiryDate: input.subscriptionExpiryDate,
      invoiceNumber: input.invoiceNumber,
      paymentProvider: input.paymentProvider,
    };
  }

  private buildPlainTextBody(input: SendInvoiceEmailInput) {
    return [
      `Hello ${input.customerName},`,
      '',
      'Your subscription has been activated successfully.',
      `Plan: ${input.subscriptionPlan}`,
      `Billing interval: ${input.billingInterval}`,
      `Payment status: ${input.paymentStatus}`,
      `Subscription expires: ${this.formatDisplayDate(input.subscriptionExpiryDate)}`,
      `Invoice attached: ${input.invoiceNumber}`,
      '',
      'Thank you for your subscription.',
    ].join('\n');
  }

  private formatDisplayDate(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private getRequiredEnv(key: string) {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is not configured`);
    }

    return value;
  }
}
