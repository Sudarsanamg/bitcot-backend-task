import axios from 'axios';
import {
  McpServer,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  StdioServerTransport,
} from '@modelcontextprotocol/sdk/server/stdio.js';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL ?? 'http://localhost:3000';

type ActiveSubscribersResponse = {
  count: number;
};

type RevenueTotalsResponse = {
  totalRevenue: number;
};

type PlatformSummaryResponse = {
  activeSubscribers: number;
  totalRevenue: number;
  totalSubscriptions: number;
  expiredSubscriptions: number;
};

// The MCP server exposes backend analytics as callable tools for Claude Desktop and any compatible client.
const server = new McpServer(
  {
    name: 'bitcot-backend-task-mcp-server',
    version: '0.0.1',
  },
);

server.registerTool(
  'getActiveSubscribers',
  {
    description: 'Returns the total number of active subscriptions.',
  },
  async () => {
    const response = await axios.get<ActiveSubscribersResponse>(
      `${BACKEND_BASE_URL}/analytics/active-subscribers`,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  'getRevenueTotals',
  {
    description: 'Returns the total simulated revenue.',
  },
  async () => {
    const response = await axios.get<RevenueTotalsResponse>(
      `${BACKEND_BASE_URL}/analytics/revenue`,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  'getPlatformSummary',
  {
    description:
      'Returns a dashboard summary containing active subscribers, total revenue, total subscriptions, and expired subscriptions.',
  },
  async () => {
    const response = await axios.get<PlatformSummaryResponse>(
      `${BACKEND_BASE_URL}/analytics/summary`,
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  },
);

async function bootstrap() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so the stdio transport stays clean for MCP messages.
  console.error('MCP server started and ready to accept tool calls.');
}

bootstrap().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});