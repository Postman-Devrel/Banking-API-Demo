import { ApiError } from './errors.js';
import fixtures from '@intergalactic/demo-fixtures';
import { assess } from './assessmentService.js';
import type { FraudAssessment, FraudConfig, RunState, StoredResponse } from './types.js';

function newRun(now: number): RunState {
  const assessments = fixtures.createFraudSeedInputs().map(input => assess(input));
  return {
    assessments: new Map(assessments.map(value => [value.assessmentId, value])), attempts: new Map(), idempotency: new Map(),
    faults: { failFirstAssessment: false }, lastAccessedAt: now
  };
}

export class FraudStore {
  readonly runs = new Map<string, RunState>();

  constructor(private readonly config: FraudConfig, private readonly now: () => number = Date.now) {}

  cleanup(): void {
    const now = this.now();
    for (const [runId, run] of this.runs) {
      if (now - run.lastAccessedAt > this.config.runTtlMs) {
        this.runs.delete(runId);
        continue;
      }
      for (const [key, record] of run.idempotency) {
        if (now - record.createdAt > this.config.idempotencyTtlMs) run.idempotency.delete(key);
      }
    }
  }

  getRun(runId: string): RunState {
    this.cleanup();
    let run = this.runs.get(runId);
    if (!run) {
      if (this.runs.size >= this.config.maxRuns) throw new ApiError(503, 'RUN_CAPACITY_REACHED', 'Fraud demo run capacity was reached', true);
      run = newRun(this.now());
      this.runs.set(runId, run);
    }
    run.lastAccessedAt = this.now();
    return run;
  }

  reset(runId: string): RunState {
    const run = newRun(this.now());
    this.runs.set(runId, run);
    return run;
  }

  getAssessment(runId: string, assessmentId: string): FraudAssessment | undefined {
    const run = this.getRun(runId);
    const value = run.assessments.get(assessmentId);
    return value ? structuredClone(value) : undefined;
  }

  saveAssessment(runId: string, assessment: FraudAssessment): void {
    this.getRun(runId).assessments.set(assessment.assessmentId, structuredClone(assessment));
  }

  incrementAttempt(runId: string, transactionId: string): number {
    const run = this.getRun(runId);
    const attempt = (run.attempts.get(transactionId) || 0) + 1;
    run.attempts.set(transactionId, attempt);
    return attempt;
  }

  configureFaults(runId: string, failFirstAssessment: boolean): void {
    this.getRun(runId).faults.failFirstAssessment = failFirstAssessment;
  }

  replay(runId: string, scope: string, fingerprint: string): StoredResponse | undefined {
    const record = this.getRun(runId).idempotency.get(scope);
    if (!record) return undefined;
    if (record.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'The idempotency key was reused with different input');
    if (record.state === 'IN_PROGRESS') throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'A request with this idempotency key is still in progress', true);
    return structuredClone(record);
  }

  reserve(runId: string, scope: string, fingerprint: string): void {
    const run = this.getRun(runId);
    if (!run.idempotency.has(scope) && run.idempotency.size >= this.config.maxIdempotencyPerRun) {
      throw new ApiError(503, 'IDEMPOTENCY_CAPACITY_REACHED', 'Fraud idempotency capacity was reached', true);
    }
    if (run.idempotency.has(scope)) throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'A request with this idempotency key is already reserved', true);
    run.idempotency.set(scope, { state: 'IN_PROGRESS', fingerprint, createdAt: this.now() });
  }

  complete(runId: string, scope: string, response: StoredResponse): void {
    const run = this.getRun(runId);
    const reserved = run.idempotency.get(scope);
    if (!reserved || reserved.fingerprint !== response.fingerprint) {
      throw new ApiError(500, 'IDEMPOTENCY_STATE_ERROR', 'The idempotency reservation is unavailable', true);
    }
    run.idempotency.set(scope, structuredClone(response));
  }

  summary(runId: string) {
    const run = this.getRun(runId);
    return {
      runId, seedVersion: fixtures.seedVersions.fraud, assessments: run.assessments.size,
      attempts: [...run.attempts.values()].reduce((total, count) => total + count, 0),
      assessmentIds: [...run.assessments.keys()].sort(),
      attemptsByTransaction: Object.fromEntries([...run.attempts.entries()].sort(([left], [right]) => left.localeCompare(right))),
      faults: structuredClone(run.faults)
    };
  }
}
