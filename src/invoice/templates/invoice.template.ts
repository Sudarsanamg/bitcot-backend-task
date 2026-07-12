export interface InvoiceTemplateData {
  invoiceNumber: string;
  companyName: string;
  companySubtitle: string;
  customerName: string;
  customerEmail: string;
  paymentProvider: string;
  paymentStatus: string;
  subscriptionPlan: string;
  billingInterval: string;
  subscriptionStartDate: Date;
  subscriptionExpiryDate: Date;
  paymentDate: Date;
  generatedDate: Date;
  invoiceDate: Date;
}

export function generateInvoiceTemplate(data: InvoiceTemplateData): string {
  const formattedGeneratedDate = formatDate(data.generatedDate);
  const formattedPaymentDate = formatDate(data.paymentDate);
  const formattedStartDate = formatDate(data.subscriptionStartDate);
  const formattedExpiryDate = formatDate(data.subscriptionExpiryDate);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fb;
      --card: #ffffff;
      --border: #e5e7eb;
      --muted: #6b7280;
      --text: #111827;
      --subtle: #f9fafb;
      --accent: #2563eb;
      --success: #059669;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      padding: 28px;
    }
    .sheet {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .header {
      padding: 28px 32px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.04));
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      border: 1px dashed rgba(37, 99, 235, 0.35);
      display: grid;
      place-items: center;
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.8);
    }
    .brand h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
    }
    .brand p,
    .meta p,
    .note,
    .footer {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }
    .invoice-title {
      text-align: right;
    }
    .invoice-title h2 {
      margin: 0;
      font-size: 32px;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .invoice-title .pill {
      display: inline-block;
      margin-top: 10px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(5, 150, 105, 0.1);
      color: var(--success);
      font-size: 12px;
      font-weight: 700;
    }
    .content {
      padding: 28px 32px 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 20px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--card);
      padding: 20px;
    }
    .section-title {
      margin: 0 0 14px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .details {
      width: 100%;
      border-collapse: collapse;
    }
    .details tr + tr td {
      border-top: 1px solid var(--border);
    }
    .details td {
      padding: 12px 0;
      vertical-align: top;
      font-size: 14px;
    }
    .details td:first-child {
      color: var(--muted);
      width: 42%;
      padding-right: 16px;
    }
    .summary {
      display: grid;
      gap: 12px;
    }
    .summary-item {
      padding: 14px;
      border-radius: 16px;
      background: var(--subtle);
      border: 1px solid var(--border);
    }
    .summary-item .label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .summary-item .value {
      display: block;
      font-size: 14px;
      font-weight: 600;
    }
    .footer-wrap {
      padding: 0 32px 28px;
    }
    .footer {
      padding-top: 18px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    @media print {
      body { background: white; }
      .page { padding: 0; width: 210mm; min-height: 297mm; }
      .sheet { border-radius: 0; box-shadow: none; border: none; }
    }
    @media (max-width: 640px) {
      .page { width: 100%; padding: 12px; }
      .header, .grid, .footer { display: block; }
      .invoice-title { text-align: left; margin-top: 18px; }
      .content, .header, .footer-wrap { padding-left: 18px; padding-right: 18px; }
      .details td:first-child { width: 50%; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="sheet">
      <header class="header">
        <div class="brand">
          <div class="logo">Logo</div>
          <div>
            <h1>${escapeHtml(data.companyName)}</h1>
            <p>${escapeHtml(data.companySubtitle)}</p>
          </div>
        </div>
        <div class="invoice-title">
          <h2>Invoice</h2>
          <div class="pill">${escapeHtml(data.paymentStatus)}</div>
          <p class="meta">${escapeHtml(data.invoiceNumber)}<br />Generated ${escapeHtml(formattedGeneratedDate)}</p>
        </div>
      </header>

      <div class="content">
        <div class="grid">
          <article class="card">
            <p class="section-title">Customer Details</p>
            <table class="details" role="presentation">
              <tr><td>Customer Name</td><td>${escapeHtml(data.customerName)}</td></tr>
              <tr><td>Customer Email</td><td>${escapeHtml(data.customerEmail)}</td></tr>
              <tr><td>Payment Provider</td><td>${escapeHtml(data.paymentProvider)}</td></tr>
              <tr><td>Payment Date</td><td>${escapeHtml(formattedPaymentDate)}</td></tr>
            </table>
          </article>

          <aside class="card">
            <p class="section-title">Subscription Summary</p>
            <div class="summary">
              <div class="summary-item"><span class="label">Subscription Plan</span><span class="value">${escapeHtml(data.subscriptionPlan)}</span></div>
              <div class="summary-item"><span class="label">Billing Interval</span><span class="value">${escapeHtml(data.billingInterval)}</span></div>
              <div class="summary-item"><span class="label">Start Date</span><span class="value">${escapeHtml(formattedStartDate)}</span></div>
              <div class="summary-item"><span class="label">Expiry Date</span><span class="value">${escapeHtml(formattedExpiryDate)}</span></div>
            </div>
          </aside>
        </div>
      </div>

      <div class="footer-wrap">
        <footer class="footer">
          <span>Thank you for your subscription.</span>
          <span>Generated automatically for billing records.</span>
        </footer>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
