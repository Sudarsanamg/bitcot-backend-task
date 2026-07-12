import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { basename } from 'path';

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
    const subject = 'Subscription Activated Successfully';
    const text = this.buildTextBody(input);
    const html = this.buildHtmlBody(input);

    await this.transporter.sendMail({
      from: this.mailFrom,
      to: input.customerEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename: basename(input.invoiceFilePath),
          path: input.invoiceFilePath,
        },
      ],
    });
  }

  private buildTextBody(input: SendInvoiceEmailInput) {
    return [
      `Hello ${input.customerName},`,
      '',
      'Your subscription payment was processed successfully.',
      '',
      `Subscription Plan: ${input.subscriptionPlan}`,
      `Billing Interval: ${input.billingInterval}`,
      `Payment Status: ${input.paymentStatus}`,
      `Payment Provider: ${input.paymentProvider}`,
      `Start Date: ${this.formatDisplayDate(input.subscriptionStartDate)}`,
      `Expiry Date: ${this.formatDisplayDate(input.subscriptionExpiryDate)}`,
      `Payment Date: ${this.formatDisplayDate(input.paymentDate)}`,
      '',
      'Thank you for your subscription.',
    ].join('\n');
  }

  private buildHtmlBody(input: SendInvoiceEmailInput) {
    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Hello ${input.customerName},</p>
        <p>Your subscription payment was processed successfully.</p>
        <p><strong>Subscription Plan:</strong> ${input.subscriptionPlan}<br />
        <strong>Billing Interval:</strong> ${input.billingInterval}<br />
        <strong>Payment Status:</strong> ${input.paymentStatus}<br />
        <strong>Payment Provider:</strong> ${input.paymentProvider}<br />
        <strong>Start Date:</strong> ${this.formatDisplayDate(input.subscriptionStartDate)}<br />
        <strong>Expiry Date:</strong> ${this.formatDisplayDate(input.subscriptionExpiryDate)}<br />
        <strong>Payment Date:</strong> ${this.formatDisplayDate(input.paymentDate)}</p>
        <p>Thank you for your subscription.</p>
      </div>
    `;
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