# Bitcot Backend Task

This project is a robust backend application built with **NestJS**, **Prisma** (PostgreSQL), **Redis**, and **BullMQ** for background job processing. It also includes a custom **Model Context Protocol (MCP)** server to expose internal analytics (revenue, active subscribers) securely to AI agents.

---

## 🛠️ Application Setup

1. **Install Dependencies**
   Install the required Node.js packages for both the main application and the MCP server.
   ```bash
   # Install main application dependencies
   npm install

   # Install MCP server dependencies
   cd mcp-server
   npm install
   cd ..
   ```

2. **Environment Variables**
   Create a `.env` file in the root of the project and provide the necessary credentials. You will need:
   - Database Connection String (PostgreSQL)
   - Redis Connection URL
   - Stripe Secret Keys and Webhook Secrets
   - SMTP Credentials for Email (Nodemailer)

3. **Infrastructure Setup (Docker)**
   This project uses `docker-compose` to run PostgreSQL and Redis locally. Start the infrastructure in the background:
   ```bash
   docker-compose up -d
   ```
   *(Note: The database runs on port 5433 and Redis on 6379 as configured in `docker-compose.yml`)*

4. **Database Migration**
   Once the database container is running, execute Prisma migrations to set up your schema:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   # Or push directly to the DB schema
   npx prisma db push
   ```

---

## 🚀 Running the Application

You can run the application in various modes depending on your environment.

**Development Mode:**
```bash
npm run start:dev
```

**Production Mode:**
```bash
npm run build
npm run start:prod
```

Once started, the application exposes REST endpoints for webhooks (e.g., Stripe) and internal routing (e.g., `/analytics/revenue`).

---

## ⚙️ Verifying Background Jobs

The application leverages **BullMQ** backed by **Redis** to handle asynchronous tasks such as sending subscription renewal reminder emails.

1. **Start the Application**: Ensure the NestJS application is running (`npm run start:dev`).
2. **Check the Logs**: Upon startup, you will see output confirming that the job processors and cron services have started:
   ```
   [ReminderProcessor] Renewal reminders worker started
   [ReminderCronService] Subscription renewal reminder cron started
   ```
3. **Execution**: The Cron service regularly checks for subscriptions expiring within a certain timeframe (e.g., 3 days). If it finds matches, it enqueues a job, and the worker processes it (e.g., sending an email via Nodemailer). 
   ```
   [ReminderCronService] Found 1 subscription(s) expiring within the next 3 days
   [ReminderCronService] Enqueued 1 renewal reminder job(s)
   [ReminderProcessor] Renewal reminder email sent for subscription <id>
   ```

---

## 🤖 Using the MCP Server with an AI Client

The project includes a custom **MCP Server** in the `/mcp-server` directory. This server exposes specific backend capabilities (such as fetching active subscribers, revenue, and platform summaries) directly to AI assistants like Antigravity or Claude Desktop.

### 1. Build the MCP Server
First, ensure the MCP server is built and transpiled to JavaScript.
```bash
cd mcp-server
npm run build
```

### 2. Configure the AI Client
To connect the MCP server to your AI client, you must configure the client to run the generated Node.js script.

**For Antigravity:**
Open or create `~/.gemini/antigravity/mcp_config.json` and add the following configuration, ensuring you use the absolute path to the compiled `index.js` file:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/project/bitcot-backend-task/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 3. Usage
Restart your AI client or begin a new conversation. The AI will automatically spawn the custom MCP server as a background process via `stdio`. You can now ask the AI questions like:
- *"What is the total revenue?"*
- *"How many active subscribers are there?"*
- *"Give me a platform summary."*

The AI will use the MCP server tools to interact with your local environment securely and answer the queries!



##Stripe port forward
stripe listen --forward-to localhost:3000/stripe/webhook

docker compose up -d

<!-- 
UPDATE "Subscription"
SET
  "expiryDate" = NOW(),
  "currentPeriodEnd" = NOW(),
  "updatedAt" = NOW()
WHERE "userId" = (
  SELECT "id"
  FROM "User"
  WHERE "email" = 'test123@example.com'
); -->