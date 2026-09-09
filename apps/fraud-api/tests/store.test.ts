import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { FraudStore } from '../src/store.js';

describe('run-scoped Fraud storage', () => {
  it('isolates attempts and faults by run', () => {
    const store = new FraudStore(loadConfig({}));
    store.configureFaults('direct', true);
    expect(store.getRun('direct').faults.failFirstAssessment).toBe(true);
    expect(store.getRun('fabric').faults.failFirstAssessment).toBe(false);
    expect(store.incrementAttempt('direct', 'TX')).toBe(1);
    expect(store.incrementAttempt('direct', 'TX')).toBe(2);
    expect(store.incrementAttempt('fabric', 'TX')).toBe(1);
  });

  it('expires idle runs and idempotency records', () => {
    let now = 1000;
    const config = loadConfig({ FRAUD_RUN_TTL_MS: '100', FRAUD_IDEMPOTENCY_TTL_MS: '10' });
    const store = new FraudStore(config, () => now);
    store.getRun('old');
    store.reserve('active', 'scope', 'one');
    store.complete('active', 'scope', { state: 'COMPLETED', fingerprint: 'one', status: 200, body: {}, headers: {}, createdAt: now });
    now += 20;
    store.cleanup();
    expect(store.getRun('active').idempotency.size).toBe(0);
    now += 100;
    store.cleanup();
    expect(store.runs.has('old')).toBe(false);
  });

  it('enforces run, idempotency capacity, and fingerprint conflicts', () => {
    const store = new FraudStore(loadConfig({ MAX_FRAUD_RUNS: '1', MAX_FRAUD_IDEMPOTENCY_PER_RUN: '1' }));
    store.reserve('one', 'first', 'a');
    store.complete('one', 'first', { state: 'COMPLETED', fingerprint: 'a', status: 200, body: {}, headers: {}, createdAt: Date.now() });
    expect(() => store.reserve('one', 'second', 'b')).toThrow('capacity');
    expect(() => store.replay('one', 'first', 'different')).toThrow('different input');
    expect(() => store.getRun('two')).toThrow('run capacity');
  });

  it('rejects duplicate in-progress reservations', () => {
    const store = new FraudStore(loadConfig({}));
    store.reserve('one', 'scope', 'same');
    expect(() => store.replay('one', 'scope', 'same')).toThrow('still in progress');
    expect(() => store.reserve('one', 'scope', 'same')).toThrow('already reserved');
  });

  it('returns safe copies and deterministic reset summaries', () => {
    const store = new FraudStore(loadConfig({}));
    store.configureFaults('run', true);
    store.incrementAttempt('run', 'TX');
    expect(store.summary('run')).toMatchObject({ attempts: 1, faults: { failFirstAssessment: true } });
    store.reset('run');
    expect(store.summary('run')).toEqual({
      runId: 'run', seedVersion: 'fabric-fraud-v2', assessments: 3, attempts: 0,
      assessmentIds: ['FRA-55692', 'FRA-76469', 'FRA-81139'], attemptsByTransaction: {},
      faults: { failFirstAssessment: false }
    });
  });
});
