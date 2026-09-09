import type { SupportConfig } from './types.js';

function positive(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SupportConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const agentApiKey = env.SUPPORT_API_KEY || (production ? '' : 'support-demo-key');
  const adminApiKey = env.SUPPORT_ADMIN_API_KEY || (production ? '' : 'support-admin-demo-key');
  if (!agentApiKey) throw new Error('SUPPORT_API_KEY is required in production');
  if (!adminApiKey) throw new Error('SUPPORT_ADMIN_API_KEY is required in production');
  if (agentApiKey === adminApiKey) throw new Error('Support agent and administrator API keys must differ');
  return {
    nodeEnv, host: env.SUPPORT_HOST || '127.0.0.1', port: positive(env.SUPPORT_PORT, 8090, 'SUPPORT_PORT'),
    agentApiKey, adminApiKey, maxRuns: positive(env.MAX_SUPPORT_RUNS, 100, 'MAX_SUPPORT_RUNS'),
    runTtlMs: positive(env.SUPPORT_RUN_TTL_MS, 3_600_000, 'SUPPORT_RUN_TTL_MS'),
    idempotencyTtlMs: positive(env.SUPPORT_IDEMPOTENCY_TTL_MS, 900_000, 'SUPPORT_IDEMPOTENCY_TTL_MS'),
    maxIdempotencyPerRun: positive(env.MAX_SUPPORT_IDEMPOTENCY_PER_RUN, 2000, 'MAX_SUPPORT_IDEMPOTENCY_PER_RUN'),
    rateLimitRequests: positive(env.SUPPORT_RATE_LIMIT_REQUESTS, 600, 'SUPPORT_RATE_LIMIT_REQUESTS'),
    rateLimitWindowMs: positive(env.SUPPORT_RATE_LIMIT_WINDOW_MS, 60_000, 'SUPPORT_RATE_LIMIT_WINDOW_MS')
  };
}
