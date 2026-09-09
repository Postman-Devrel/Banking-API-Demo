import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { CredentialRegistry } from '../src/auth.js';
import { paginate } from '../src/pagination.js';
import { SupportService } from '../src/service.js';
import { SupportStore } from '../src/store.js';

describe('Support run storage and pagination', () => {
  it('seeds isolated canonical cases and deterministic clocks', () => {
    const store = new SupportStore(loadConfig({}));
    const direct = store.getRun('direct'); const fabric = store.getRun('fabric');
    expect(direct.cases.get('CASE-2042')).toEqual(fabric.cases.get('CASE-2042'));
    expect(direct.notes.get('NOTE-2001')?.content).toContain('Gary Galaxy');
    expect(direct.cases.size).toBe(5);
    expect(direct.evidence.size).toBe(6);
    expect(direct.tasks.size).toBe(4);
    expect(store.nextId(direct, 'EVD')).toBe('EVD-3007');
    expect(store.nextTimestamp(direct)).toBe('2026-09-08T15:30:01.000Z');
  });

  it('reserves, completes, replays, conflicts, releases and expires idempotency', () => {
    let now = 1000; const store = new SupportStore(loadConfig({ SUPPORT_IDEMPOTENCY_TTL_MS: '10', SUPPORT_RUN_TTL_MS: '100' }), () => now);
    store.reserve('run', 'scope', 'one');
    expect(() => store.replay('run', 'scope', 'one')).toThrow('still in progress');
    expect(() => store.reserve('run', 'scope', 'one')).toThrow('already reserved');
    store.complete('run', 'scope', { state: 'COMPLETED', fingerprint: 'one', status: 200, body: { ok: true }, headers: {}, createdAt: now });
    expect(store.replay('run', 'scope', 'one')?.body).toEqual({ ok: true });
    expect(() => store.replay('run', 'scope', 'two')).toThrow('different input');
    store.reserve('run', 'released', 'x'); store.release('run', 'released'); expect(store.replay('run', 'released', 'x')).toBeUndefined();
    now += 20; store.cleanup(); expect(store.getRun('run').idempotency.size).toBe(0);
    now += 101; store.cleanup(); expect(store.peekRun('run')).toBeUndefined();
  });

  it('enforces run and idempotency capacities', () => {
    const store = new SupportStore(loadConfig({ MAX_SUPPORT_RUNS: '1', MAX_SUPPORT_IDEMPOTENCY_PER_RUN: '1' }));
    store.reserve('one', 'a', 'a'); expect(() => store.reserve('one', 'b', 'b')).toThrow('capacity'); expect(() => store.getRun('two')).toThrow('run capacity');
  });

  it('uses stable opaque cursor pagination and rejects invalid controls', () => {
    const first = paginate([1, 2, 3], { limit: '2' }); expect(first.items).toEqual([1, 2]); expect(first.page.hasMore).toBe(true);
    expect(paginate([1, 2, 3], { limit: '2', cursor: first.page.nextCursor! }).items).toEqual([3]);
    expect(() => paginate([], { limit: '0' })).toThrow('limit'); expect(() => paginate([], { cursor: 'bad' })).toThrow('cursor');
  });

  it('rejects unknown internal operation identifiers', () => {
    const config = loadConfig({}); const store = new SupportStore(config); const service = new SupportService(store, new CredentialRegistry(config));
    expect(() => service.execute('notAnOperation', { runId: 'run', principal: { principalId: 'P', role: 'SUPPORT_AGENT', displayName: 'Agent' }, requestId: 'R', params: {}, query: {}, body: {} })).toThrow('notAnOperation');
  });
});
