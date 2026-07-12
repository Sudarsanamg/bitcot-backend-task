export interface RenewalReminderTemplateData {
  customerName: string;
  subscriptionPlan: string;
  billingInterval: string;
  subscriptionExpiryDate: Date | string;
}

export function renewalReminderTemplate(
  data: RenewalReminderTemplateData,
): string {
  const formattedExpiryDate = formatDate(data.subscriptionExpiryDate);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subscription Renewal Reminder</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%); padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 50px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#334155 100%); padding:28px 32px; color:#ffffff;">
              <div style="font-size:12px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.8;">AI SaaS Subscription</div>
              <div style="font-size:24px; font-weight:700; margin-top:8px;">Subscription Renewal Reminder</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="width:56px; height:56px; border-radius:18px; background-color:#fff7ed; color:#f97316; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700;">!</div>
              <p style="font-size:16px; line-height:1.7; margin:20px 0 0;">Hello ${escapeHtml(data.customerName)}, your subscription is approaching expiration. Please renew soon to keep your service active.</p>

              <div style="margin-top:24px; border:1px solid #e5e7eb; border-radius:20px; overflow:hidden;">
                <div style="padding:18px 20px; background-color:#f9fafb; border-bottom:1px solid #e5e7eb; font-size:13px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em;">Subscription Details</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:0 20px;">
                  <tr><td style="padding:16px 0; color:#6b7280; width:45%;">Subscription Plan</td><td style="padding:16px 0; font-weight:600;">${escapeHtml(data.subscriptionPlan)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Billing Interval</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(data.billingInterval)}</td></tr>
                  <tr><td style="padding:16px 0; color:#6b7280; border-top:1px solid #e5e7eb;">Expiry Date</td><td style="padding:16px 0; font-weight:600; border-top:1px solid #e5e7eb;">${escapeHtml(formattedExpiryDate)}</td></tr>
                </table>
              </div>

              <div style="margin-top:24px; padding:16px 20px; background-color:#eff6ff; border:1px solid #dbeafe; border-radius:16px; color:#1d4ed8; font-size:14px; line-height:1.6;">
                Renewing now helps avoid any interruption in access. If you have already renewed, you can ignore this message.
              </div>

              <p style="margin:24px 0 0; font-size:15px; line-height:1.7;">Thank you for staying with us.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px; line-height:1.6;">
              This is an automated reminder from the subscription team. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid subscription expiry date');
  }

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