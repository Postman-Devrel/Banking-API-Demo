import type { FraudConfig } from './types.js';

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): FraudConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  const customerApiKey = env.FRAUD_API_KEY || (production ? '' : 'fraud-demo-key');
  const adminApiKey = env.FRAUD_ADMIN_API_KEY || (production ? '' : 'fraud-admin-demo-key');
  if (!customerApiKey) throw new Error('FRAUD_API_KEY is required in production');
  if (!adminApiKey) throw new Error('FRAUD_ADMIN_API_KEY is required in production');
  if (customerApiKey === adminApiKey) throw new Error('Fraud customer and administrator API keys must differ');
  return {
    nodeEnv, host: env.FRAUD_HOST || '127.0.0.1', port: positiveInteger(env.FRAUD_PORT, 8080, 'FRAUD_PORT'),
    customerApiKey, adminApiKey,
    maxRuns: positiveInteger(env.MAX_FRAUD_RUNS, 100, 'MAX_FRAUD_RUNS'),
    runTtlMs: positiveInteger(env.FRAUD_RUN_TTL_MS, 3_600_000, 'FRAUD_RUN_TTL_MS'),
    idempotencyTtlMs: positiveInteger(env.FRAUD_IDEMPOTENCY_TTL_MS, 900_000, 'FRAUD_IDEMPOTENCY_TTL_MS'),
    maxIdempotencyPerRun: positiveInteger(env.MAX_FRAUD_IDEMPOTENCY_PER_RUN, 1000, 'MAX_FRAUD_IDEMPOTENCY_PER_RUN')
  };
}
