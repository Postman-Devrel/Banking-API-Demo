import { ApiError } from './errors.js';
import fixtures from '@intergalactic/demo-fixtures';
import type { Article, CompletedIdempotency, Escalation, Evidence, Interaction, KnowledgeLink, Note, Queue, RelatedCaseLink, RunState, SlaPolicy, SupportCase, SupportConfig, Task, TimelineEvent, VerificationRequest } from './types.js';

const CLOCK_BASE = Date.parse('2026-09-08T15:30:00.000Z');

export const queues: Queue[] = [
  { queueId: 'QUEUE-PAYMENTS', name: 'Payments Support', description: 'Payment and transfer investigations.', active: true, skills: ['payments', 'transfers'] },
  { queueId: 'QUEUE-FRAUD', name: 'Fraud Team', description: 'High-risk fraud investigations.', active: true, skills: ['fraud', 'identity-verification'] },
  { queueId: 'QUEUE-COMPLIANCE', name: 'Compliance', description: 'Regulatory and policy review.', active: true, skills: ['compliance'] },
  { queueId: 'QUEUE-MANAGERS', name: 'Support Managers', description: 'Operational escalations.', active: true, skills: ['escalation-management'] }
];

export const articles: Article[] = [
  { articleId: 'KB-1001', title: 'Investigating an unrecognized transfer', summary: 'Evidence checklist for disputed transfers.', content: 'Confirm transaction details, obtain fraud risk evidence, and request customer verification before resolution.', category: 'UNRECOGNIZED_TRANSACTION', tags: ['fraud', 'transfers'], version: 1, updatedAt: '2026-08-01T00:00:00.000Z' },
  { articleId: 'KB-1002', title: 'Customer identity verification', summary: 'Approved verification methods.', content: 'Record the verification request and await an authorized completion outcome.', category: 'IDENTITY_VERIFICATION', tags: ['identity-verification'], version: 1, updatedAt: '2026-08-02T00:00:00.000Z' },
  { articleId: 'KB-1003', title: 'Escalating high-risk fraud', summary: 'When to involve the fraud team.', content: 'Attach the fraud assessment and transaction evidence before escalating.', category: 'FRAUD', tags: ['fraud', 'escalation'], version: 1, updatedAt: '2026-08-03T00:00:00.000Z' },
  { articleId: 'KB-1004', title: 'Refund restrictions', summary: 'Controls that apply before a refund.', content: 'A risk score alone never authorizes an immediate refund or case resolution.', category: 'POLICY', tags: ['refund', 'policy'], version: 1, updatedAt: '2026-08-04T00:00:00.000Z' },
  { articleId: 'KB-1005', title: 'Compromised account handling', summary: 'Steps for suspected account compromise.', content: 'Escalate and follow identity-verification policy without exposing credentials.', category: 'ACCOUNT_ACCESS', tags: ['security', 'fraud'], version: 1, updatedAt: '2026-08-05T00:00:00.000Z' },
  { articleId: 'KB-1006', title: 'Tracing delayed incoming payments', summary: 'How to investigate a payment reported as late.', content: 'Confirm the transaction identifier, posting timestamp, and receiving account before escalating to payments operations.', category: 'PAYMENT_DELAY', tags: ['payments', 'transfers'], version: 1, updatedAt: '2026-08-06T00:00:00.000Z' },
  { articleId: 'KB-1007', title: 'Reviewing new account sessions', summary: 'Safe workflow for unfamiliar session alerts.', content: 'Verify customer identity before discussing session history or changing account security settings.', category: 'ACCOUNT_ACCESS', tags: ['security', 'identity-verification'], version: 1, updatedAt: '2026-08-07T00:00:00.000Z' }
];

export const slaPolicies: SlaPolicy[] = [
  { policyId: 'SLA-LOW', name: 'Low priority', priority: 'LOW', responseMinutes: 480, resolutionMinutes: 4320 },
  { policyId: 'SLA-MEDIUM', name: 'Medium priority', priority: 'MEDIUM', responseMinutes: 240, resolutionMinutes: 2880 },
  { policyId: 'SLA-HIGH', name: 'High priority', priority: 'HIGH', responseMinutes: 120, resolutionMinutes: 1440 },
  { policyId: 'SLA-CRITICAL', name: 'Critical priority', priority: 'CRITICAL', responseMinutes: 30, resolutionMinutes: 240 }
];

export const supportTags = ['disputed-transfer', 'fraud-review', 'identity-verification', 'high-value', 'customer-contacted', 'duplicate', 'compliance-review'];

function createRun(now: number): RunState {
  const seed = fixtures.createSupportSeed() as unknown as {
    cases: SupportCase[]; notes: Note[]; evidence: Evidence[]; verifications: VerificationRequest[];
    escalations: Escalation[]; tasks: Task[]; relatedCases: RelatedCaseLink[]; interactions: Interaction[];
    knowledgeLinks: KnowledgeLink[]; events: TimelineEvent[];
  };
  const keyed = <T>(values: T[], key: (value: T) => string): Map<string, T> => new Map(values.map(value => [key(value), value]));
  return {
    cases: keyed(seed.cases, value => value.caseId), notes: keyed(seed.notes, value => value.noteId),
    evidence: keyed(seed.evidence, value => value.evidenceId), verifications: keyed(seed.verifications, value => value.verificationId),
    escalations: keyed(seed.escalations, value => value.escalationId), tasks: keyed(seed.tasks, value => value.taskId),
    relatedCases: keyed(seed.relatedCases, value => `${value.caseId}:${value.relatedCaseId}`),
    interactions: keyed(seed.interactions, value => value.interactionId),
    knowledgeLinks: keyed(seed.knowledgeLinks, value => `${value.caseId}:${value.articleId}`),
    events: seed.events, idempotency: new Map(),
    counters: { CASE: 2060, NOTE: 2006, EVD: 3006, VER: 4003, ESC: 5001, TASK: 6004, INT: 2007, EVT: 2013, PRN: 1000 },
    clockSequence: 0, lastAccessedAt: now
  };
}

export class SupportStore {
  readonly runs = new Map<string, RunState>();
  constructor(private readonly config: SupportConfig, private readonly now: () => number = Date.now) {}

  cleanup(): void {
    const current = this.now();
    for (const [runId, run] of this.runs) {
      if (current - run.lastAccessedAt > this.config.runTtlMs) { this.runs.delete(runId); continue; }
      for (const [key, record] of run.idempotency) if (current - record.createdAt > this.config.idempotencyTtlMs) run.idempotency.delete(key);
    }
  }

  getRun(runId: string): RunState {
    this.cleanup();
    let run = this.runs.get(runId);
    if (!run) {
      if (this.runs.size >= this.config.maxRuns) throw new ApiError(503, 'RUN_CAPACITY_REACHED', 'Support demo run capacity was reached', true);
      run = createRun(this.now()); this.runs.set(runId, run);
    }
    run.lastAccessedAt = this.now();
    return run;
  }

  peekRun(runId: string): RunState | undefined { this.cleanup(); return this.runs.get(runId); }
  reset(runId: string): RunState { const run = createRun(this.now()); this.runs.set(runId, run); return run; }

  nextId(run: RunState, prefix: string): string { run.counters[prefix] = (run.counters[prefix] || 0) + 1; return `${prefix}-${run.counters[prefix]}`; }
  nextTimestamp(run: RunState): string { run.clockSequence += 1; return new Date(CLOCK_BASE + run.clockSequence * 1000).toISOString(); }

  replay(runId: string, scope: string, fingerprint: string): CompletedIdempotency | undefined {
    const record = this.getRun(runId).idempotency.get(scope);
    if (!record) return undefined;
    if (record.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'The idempotency key was reused with different input');
    if (record.state === 'IN_PROGRESS') throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'A request with this idempotency key is still in progress', true);
    return structuredClone(record);
  }

  reserve(runId: string, scope: string, fingerprint: string): void {
    const run = this.getRun(runId);
    if (!run.idempotency.has(scope) && run.idempotency.size >= this.config.maxIdempotencyPerRun) throw new ApiError(503, 'IDEMPOTENCY_CAPACITY_REACHED', 'Support idempotency capacity was reached', true);
    if (run.idempotency.has(scope)) throw new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'A request with this idempotency key is already reserved', true);
    run.idempotency.set(scope, { state: 'IN_PROGRESS', fingerprint, createdAt: this.now() });
  }

  complete(runId: string, scope: string, response: CompletedIdempotency): void {
    const run = this.getRun(runId); const current = run.idempotency.get(scope);
    if (!current || current.fingerprint !== response.fingerprint) throw new ApiError(500, 'IDEMPOTENCY_STATE_ERROR', 'The idempotency reservation is unavailable', true);
    run.idempotency.set(scope, structuredClone(response));
  }

  release(runId: string, scope: string): void { this.runs.get(runId)?.idempotency.delete(scope); }
}
