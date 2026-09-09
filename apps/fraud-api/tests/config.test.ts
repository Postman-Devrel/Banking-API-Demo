import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('Fraud API configuration', () => {
  it('uses separate local demo credentials and bounded storage defaults', () => {
    expect(loadConfig({})).toMatchObject({
      host: '127.0.0.1', port: 8080, customerApiKey: 'fraud-demo-key',
      adminApiKey: 'fraud-admin-demo-key', maxRuns: 100, maxIdempotencyPerRun: 1000
    });
  });

  it('requires explicit, distinct production credentials', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('FRAUD_API_KEY');
    expect(() => loadConfig({ NODE_ENV: 'production', FRAUD_API_KEY: 'one' })).toThrow('FRAUD_ADMIN_API_KEY');
    expect(() => loadConfig({ FRAUD_API_KEY: 'same', FRAUD_ADMIN_API_KEY: 'same' })).toThrow('must differ');
  });

  it('rejects invalid numeric limits', () => {
    expect(() => loadConfig({ FRAUD_PORT: 'invalid' })).toThrow('FRAUD_PORT');
    expect(() => loadConfig({ MAX_FRAUD_RUNS: '0' })).toThrow('MAX_FRAUD_RUNS');
  });
});
