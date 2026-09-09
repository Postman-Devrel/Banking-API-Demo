import type { McpConfig, RequestScope } from './types.js';

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
function positive(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const nodeEnv = env.NODE_ENV || 'development'; const production = nodeEnv === 'production';
  const supportApiKey = env.SUPPORT_API_KEY || (production ? '' : 'support-demo-key');
  const mcpApiKey = env.SUPPORT_MCP_API_KEY || (production ? '' : 'support-mcp-demo-key');
  const defaultDemoRunId = env.DEFAULT_SUPPORT_DEMO_RUN_ID || 'default';
  if (!supportApiKey) throw new Error('SUPPORT_API_KEY is required in production');
  if (!mcpApiKey) throw new Error('SUPPORT_MCP_API_KEY is required in production');
  if (supportApiKey === mcpApiKey) throw new Error('Support MCP and downstream API keys must differ');
  if (!RUN_ID_PATTERN.test(defaultDemoRunId)) throw new Error('DEFAULT_SUPPORT_DEMO_RUN_ID must match [A-Za-z0-9_-]{1,64}');
  let supportApiBaseUrl: string;
  try { supportApiBaseUrl = new URL(env.SUPPORT_API_BASE_URL || 'http://127.0.0.1:8090').toString().replace(/\/$/, ''); }
  catch { throw new Error('SUPPORT_API_BASE_URL must be an absolute URL'); }
  return {
    nodeEnv, host: env.SUPPORT_MCP_HOST || '127.0.0.1', port: positive(env.SUPPORT_MCP_PORT, 3200, 'SUPPORT_MCP_PORT'),
    supportApiBaseUrl, supportApiKey, mcpApiKey, defaultDemoRunId,
    requestTimeoutMs: positive(env.SUPPORT_API_TIMEOUT_MS, 10_000, 'SUPPORT_API_TIMEOUT_MS')
  };
}
export function resolveRequestScope(request: Request | undefined, defaultRunId: string): RequestScope {
  const runId = request?.headers.get('x-demo-run-id') || defaultRunId;
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('X-Demo-Run-Id must match [A-Za-z0-9_-]{1,64}');
  const inboundRequestId = request?.headers.get('x-request-id')?.trim() || undefined;
  if (inboundRequestId && inboundRequestId.length > 128) throw new Error('X-Request-Id must be at most 128 characters');
  return inboundRequestId ? { runId, inboundRequestId } : { runId };
}
