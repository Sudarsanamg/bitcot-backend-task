import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { join } from 'path';

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
  private readonly invoiceDirectory = join(process.cwd(), 'uploads', 'invoices');

  async generateInvoice(input: InvoiceGenerationInput): Promise<GeneratedInvoice> {
    await mkdir(this.invoiceDirectory, { recursive: true });

    const generatedDate = input.generatedDate ?? new Date();
    const invoiceNumber = await this.createInvoiceNumber(generatedDate);
    const filePath = join(this.invoiceDirectory, `${invoiceNumber}.pdf`);
    const pdfBuffer = await this.renderInvoicePdf({
      ...input,
      generatedDate,
      invoiceNumber,
    });

    await writeFile(filePath, pdfBuffer);

    return {
      invoiceNumber,
      filePath,
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

  private async renderInvoicePdf(
    input: InvoiceGenerationInput & { invoiceNumber: string; generatedDate: Date },
  ) {
    const document = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];

    return await new Promise<Buffer>((resolve, reject) => {
      document.on('data', (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));

      this.writeInvoiceContent(document, input);
      document.end();
    });
  }

  private writeInvoiceContent(
    document: InstanceType<typeof PDFDocument>,
    input: InvoiceGenerationInput & { invoiceNumber: string; generatedDate: Date },
  ) {
    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const fieldLabelWidth = 170;
    const valueWidth = pageWidth - fieldLabelWidth;

    document
      .fillColor('#111827')
      .fontSize(24)
      .text('Invoice', { align: 'center' });

    document
      .moveDown(0.5)
      .fontSize(11)
      .fillColor('#6b7280')
      .text(`Invoice Number: ${input.invoiceNumber}`, { align: 'center' })
      .text(`Generated Date: ${this.formatDisplayDate(input.generatedDate)}`, { align: 'center' });

    document.moveDown(1.5);
    this.drawSectionTitle(document, 'Billing Details');
    this.drawField(document, 'Customer Name', input.customerName, fieldLabelWidth, valueWidth);
    this.drawField(document, 'Customer Email', input.customerEmail, fieldLabelWidth, valueWidth);
    this.drawField(document, 'Subscription Plan', input.subscriptionPlan, fieldLabelWidth, valueWidth);
    this.drawField(document, 'Billing Interval', input.billingInterval, fieldLabelWidth, valueWidth);
    this.drawField(document, 'Payment Status', input.paymentStatus, fieldLabelWidth, valueWidth);
    this.drawField(document, 'Payment Provider', input.paymentProvider, fieldLabelWidth, valueWidth);
    this.drawField(
      document,
      'Subscription Start Date',
      this.formatDisplayDate(input.subscriptionStartDate),
      fieldLabelWidth,
      valueWidth,
    );
    this.drawField(
      document,
      'Subscription Expiry Date',
      this.formatDisplayDate(input.subscriptionExpiryDate),
      fieldLabelWidth,
      valueWidth,
    );
    this.drawField(
      document,
      'Payment Date',
      this.formatDisplayDate(input.paymentDate),
      fieldLabelWidth,
      valueWidth,
    );

    document.moveDown(1.2);
    document
      .fontSize(10)
      .fillColor('#6b7280')
      .text('This invoice confirms that the subscription payment was processed successfully.', {
        align: 'center',
      });
  }

  private drawSectionTitle(document: InstanceType<typeof PDFDocument>, title: string) {
    document
      .fontSize(14)
      .fillColor('#111827')
      .text(title)
      .moveDown(0.4);
  }

  private drawField(
    document: InstanceType<typeof PDFDocument>,
    label: string,
    value: string,
    labelWidth: number,
    valueWidth: number,
  ) {
    const startY = document.y;

    document
      .fontSize(11)
      .fillColor('#374151')
      .text(`${label}:`, document.page.margins.left, startY, {
        width: labelWidth,
        continued: false,
      });

    document
      .fontSize(11)
      .fillColor('#111827')
      .text(value, document.page.margins.left + labelWidth, startY, {
        width: valueWidth,
      });

    document.moveDown(0.3);
  }

  private formatDisplayDate(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private formatDateStamp(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }
}