export interface SubscriptionSuccessTemplateData {
  customerName: string;
  subscriptionPlan: string;
  billingInterval: string;
  paymentStatus: string;
  subscriptionExpiryDate: Date;
  invoiceNumber: string;
  paymentProvider: string;
}

export function subscriptionSuccessTemplate(
  data: SubscriptionSuccessTemplateData,
): string {
  const formattedExpiryDate = formatDate(data.subscriptionExpiryDate);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription Activated Successfully</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%); padding:28px 32px; color:#ffffff;">
              <div style="font-size:12px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.8;">AI SaaS Subscription</div>
              <div style="font-size:24px; font-weight:700; margin-top:8px;">Subscription Activated Successfully</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="width:56px; height:56px; border-radius:18px; background-color:#ecfdf5; color:#059669; display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:700;">✓</div>
              <p style="font-size:16px; line-height:1.7; margin:20px 0 0;">Hello ${escapeHtml(data.customerName)}, your subscription payment was processed successfully. Your invoice is attached to this email.</p>

              <div style="margin-top:24px; border:1px solid #e5e7eb; border-radius:20px; overflow:hidden;">
                <div style="padding:18px 20px; background-color:#f9fafb; border-bottom:1px solid #e5e7eb; font-size:13px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em;">Subscription Summary</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:0 20px;">
                  <tr><td style="padding:16px 0; color:#6b7280; width:45%;">Subscription Plan</td><td style="padding:16px 0; font-weight:600;">${escapeHtml(data.subscriptionPlan)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Billing Interval</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(data.billingInterval)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Payment Status</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(data.paymentStatus)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Expiry Date</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(formattedExpiryDate)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Invoice Number</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(data.invoiceNumber)}</td></tr>
                </table>
              </div>

              <div style="margin-top:24px; padding:16px 20px; background-color:#eff6ff; border:1px solid #dbeafe; border-radius:16px; color:#1d4ed8; font-size:14px; line-height:1.6;">
                Your invoice is attached for your records. If you need a copy later, keep this email safe.
              </div>

              <p style="margin:24px 0 0; font-size:15px; line-height:1.7;">Thank you for choosing our platform.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px; line-height:1.6;">
              This is an automated message from ${escapeHtml(data.paymentProvider)} billing. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
