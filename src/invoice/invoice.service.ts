import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import puppeteer from 'puppeteer';
import {
  generateInvoiceTemplate,
  type InvoiceTemplateData,
} from './templates/invoice.template';

export interface InvoiceGenerationInput {
  customerName: string;
  customerEmail: string;
  invoiceDate: Date;
  paymentDate: Date;
  paymentProvider: string;
  paymentStatus: string;
  subscriptionPlan: string;
  billingInterval: string;
  subscriptionStartDate: Date;
  subscriptionExpiryDate: Date;
  generatedDate?: Date;
}

export interface GeneratedInvoice {
  invoiceNumber: string;
  filePath: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly invoiceDirectory = join(process.cwd(), 'uploads', 'invoices');

  async generateInvoice(input: InvoiceGenerationInput): Promise<GeneratedInvoice> {
    await mkdir(this.invoiceDirectory, { recursive: true });

    const generatedDate = input.generatedDate ?? new Date();
    const invoiceNumber = await this.createInvoiceNumber(generatedDate);
    const filePath = join(this.invoiceDirectory, `${invoiceNumber}.pdf`);
    const templateData = this.buildTemplateData(input, invoiceNumber, generatedDate);
    const html = generateInvoiceTemplate(templateData);

    await this.renderHtmlToPdf(html, filePath);

    return {
      invoiceNumber,
      filePath,
    };
  }

  private buildTemplateData(
    input: InvoiceGenerationInput,
    invoiceNumber: string,
    generatedDate: Date,
  ): InvoiceTemplateData {
    return {
      invoiceNumber,
      companyName: 'AI SaaS Subscription',
      companySubtitle: 'Automated Billing & Subscription Services',
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      paymentProvider: input.paymentProvider,
      paymentStatus: input.paymentStatus,
      subscriptionPlan: input.subscriptionPlan,
      billingInterval: input.billingInterval,
      subscriptionStartDate: input.subscriptionStartDate,
      subscriptionExpiryDate: input.subscriptionExpiryDate,
      paymentDate: input.paymentDate,
      generatedDate,
      invoiceDate: input.invoiceDate,
    };
  }

  private async createInvoiceNumber(referenceDate: Date) {
    const dateStamp = this.formatDateStamp(referenceDate);
    const prefix = `INV-${dateStamp}`;
    const entries = await readdir(this.invoiceDirectory);
    const sequence =
      entries.filter((entry) => entry.startsWith(`${prefix}-`) && entry.endsWith('.pdf')).length + 1;

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  private async renderHtmlToPdf(html: string, filePath: string) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.emulateMediaType('print');
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '18mm',
          right: '12mm',
          bottom: '18mm',
          left: '12mm',
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to render invoice PDF',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    } finally {
      await browser.close();
    }
  }

  private formatDateStamp(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }
}
