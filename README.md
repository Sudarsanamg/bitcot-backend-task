# Bitcot Backend Task

This project is a backend application built with **NestJS**, **Prisma**, **PostgreSQL**, **Redis**, **BullMQ**, and **Stripe**. It also includes a custom **Model Context Protocol (MCP)** server that exposes platform analytics (revenue, active subscribers, etc.) to AI clients.

---

# 🛠️ Application Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
cd bitcot-backend-task
```

---

## 2. Install Dependencies

Install dependencies for both the main application and the MCP server.

```bash
# Main application
npm install

# MCP Server
cd mcp-server
npm install
cd ..
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

Configure the following:

- PostgreSQL Database URL
- Redis URL
- Stripe Secret Key
- Stripe Webhook Secret
- SMTP Credentials (Mailtrap)
- Other application secrets

Example:

```env
DATABASE_URL=
REDIS_URL=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## 4. Start PostgreSQL & Redis

The project includes a `docker-compose.yml`.

Start the required services:

```bash
docker compose up -d
```

By default:

- PostgreSQL → **5433**
- Redis → **6379**

---

## 5. Generate Prisma Client & Database Schema

```bash
npx prisma generate
npx prisma migrate dev
```

or

```bash
npx prisma db push
```

---

# 🚀 Running the Application

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run build
npm run start:prod
```

Application will start on:

```
http://localhost:3000
```

---

# 💳 Stripe Webhook Setup

Stripe webhooks require port forwarding using the Stripe CLI.

Open another terminal and run:

```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```

Copy the generated webhook signing secret and place it in your `.env` file.

Example:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

---

# 💰 Testing the Checkout Flow

Once the application is running:

Open:

```
http://localhost:3000/stripe/checkout
```

This endpoint creates a Stripe Checkout Session.

Then:

1. Complete the payment using Stripe's test card.
2. Stripe sends a webhook to the application.
3. The subscription is activated.
4. An invoice is generated.
5. A confirmation email with the invoice is sent to the configured **Mailtrap Sandbox** inbox.

Use Stripe's test card:

```
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any value
```

---

# ⚙️ Background Jobs (BullMQ)

The application uses **BullMQ** with **Redis** to process asynchronous tasks without blocking API requests.

### Invoice Processing

After a successful Stripe payment:

1. Stripe sends a webhook to the application.
2. The subscription is created or updated.
3. An invoice is generated.
4. A background job is added to the BullMQ queue.
5. The worker sends the invoice email to the user using **Nodemailer** (Mailtrap in development).

Example logs:

```text
[StripeWebhook] Payment completed
[InvoiceQueue] Invoice job added
[InvoiceProcessor] Invoice generated
[InvoiceProcessor] Invoice email sent successfully
```

---

### Subscription Renewal Logic

If a user already has an **active subscription** and purchases another subscription before it expires, the application **extends the existing subscription** instead of creating a new one.

For example:

| Current Expiry | User Purchases Again | New Expiry |
|---------------|----------------------|------------|
| Aug 10, 2026 | Jul 25, 2026 | Sep 9, 2026 |

This means the new billing period is **added to the current expiry date** (e.g., another **30 days**), ensuring users never lose their remaining subscription time.

---

### Daily Subscription Expiry Check

A scheduled **Cron Job** runs once every day to identify subscriptions that are nearing their expiration date.

For each matching subscription:

1. The cron service queries the database.
2. Eligible subscriptions are added to the BullMQ queue.
3. The worker processes each job.
4. A subscription renewal reminder email is sent to the user.

Example logs:

```text
[ReminderCronService] Daily subscription check started
[ReminderCronService] Found 3 subscriptions nearing expiry
[ReminderCronService] Enqueued 3 reminder jobs
[ReminderProcessor] Renewal reminder email sent to user@example.com
```

This architecture ensures that:

- Invoice emails are processed asynchronously after successful payments.
- Renewal reminder emails are sent automatically without blocking API requests.
- Background jobs remain reliable through Redis-backed BullMQ queues.
- Existing active subscriptions are extended when users purchase another subscription before expiration.

# 🤖 MCP Server Setup

## Build

```bash
cd mcp-server
npm install
npm run build
```

---

## Configure AI Client

Example configuration for Antigravity:

```json
{
  "mcpServers": {
    "bitcot-backend": {
      "command": "node",
      "args": [
        "/absolute/path/to/bitcot-backend-task/mcp-server/dist/index.js"
      ]
    }
  }
}
```

Restart the AI client after saving the configuration.

---

## Example Prompts

Once connected, ask:

- What is the total revenue?
- How many active subscribers are there?
- Show platform analytics.
- Give me a platform summary.

The AI retrieves these values through the MCP server.

---

# 🧪 Testing Subscription Expiry

To test renewal reminders without waiting for the subscription to expire, update the expiry date manually.

```sql
UPDATE "Subscription"
SET "expiryDate" = NOW() + INTERVAL '1 day'
WHERE "userId" = (
  SELECT "id"
  FROM "User"
  WHERE "email" = 'your@email.com'
);

The cron job will detect the subscription and enqueue the reminder email.

---

# 🛠 Tech Stack

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Stripe
- Nodemailer
- Mailtrap
- Model Context Protocol (MCP)
