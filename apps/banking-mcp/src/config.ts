import type { McpConfig, RequestScope } from './types.js';

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const bankingApiKey = env.BANKING_API_KEY || (production ? '' : '1234');
  const mcpApiKey = env.MCP_API_KEY || (production ? '' : 'banking-mcp-demo-key');
  const defaultDemoRunId = env.DEFAULT_DEMO_RUN_ID || 'default';

  if (!bankingApiKey) throw new Error('BANKING_API_KEY is required in production');
  if (!mcpApiKey) throw new Error('MCP_API_KEY is required in production');
  if (!RUN_ID_PATTERN.test(defaultDemoRunId)) {
    throw new Error('DEFAULT_DEMO_RUN_ID must match [A-Za-z0-9_-]{1,64}');
  }

  let bankingApiBaseUrl: string;
  try {
    bankingApiBaseUrl = new URL(env.BANKING_API_BASE_URL || 'http://127.0.0.1:3000').toString().replace(/\/$/, '');
  } catch {
    throw new Error('BANKING_API_BASE_URL must be an absolute URL');
  }

  return {
    nodeEnv,
    host: env.MCP_HOST || '127.0.0.1',
    port: positiveInteger(env.MCP_PORT, 3100, 'MCP_PORT'),
    bankingApiBaseUrl,
    bankingApiKey,
    mcpApiKey,
    defaultDemoRunId,
    requestTimeoutMs: positiveInteger(env.BANKING_API_TIMEOUT_MS, 10_000, 'BANKING_API_TIMEOUT_MS')
  };
}

export function resolveRequestScope(request: Request | undefined, defaultRunId: string): RequestScope {
  const runId = request?.headers.get('x-demo-run-id') || defaultRunId;
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('X-Demo-Run-Id must match [A-Za-z0-9_-]{1,64}');
  const inboundRequestId = request?.headers.get('x-request-id')?.trim() || undefined;
  if (inboundRequestId && inboundRequestId.length > 128) throw new Error('X-Request-Id must be at most 128 characters');
  return inboundRequestId ? { runId, inboundRequestId } : { runId };
}
