export type Role = 'SUPPORT_AGENT' | 'SUPPORT_ADMIN';
export interface Principal { principalId: string; role: Role; displayName: string }

export interface SupportCase {
  caseId: string; customerId: string; transactionId: string; subject: string; description: string;
  category: string; channel: string; status: 'OPEN' | 'INVESTIGATING' | 'AWAITING_CUSTOMER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; tags: string[]; assignedQueueId: string;
  assignedPrincipalId: string | null; verificationStatus: 'NOT_REQUESTED' | 'PENDING' | 'PASSED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  resolution: { code: string; summary: string; resolvedAt: string } | null; createdAt: string; updatedAt: string;
}
export interface Note { noteId: string; caseId: string; type: string; content: string; actorPrincipalId: string; createdAt: string }
export interface Evidence { evidenceId: string; caseId: string; type: string; referenceId: string; source: string; summary: string; facts: Record<string, unknown>; actorPrincipalId: string; createdAt: string }
export interface VerificationRequest { verificationId: string; caseId: string; method: string; reason: string; status: SupportCase['verificationStatus']; requestedByPrincipalId: string; requestedAt: string; completedAt: string | null; completionNotes: string | null }
export interface Escalation { escalationId: string; caseId: string; target: string; reason: string; evidenceIds: string[]; status: 'OPEN'; actorPrincipalId: string; createdAt: string }
export interface Queue { queueId: string; name: string; description: string; active: boolean; skills: string[] }
export interface Assignment { caseId: string; queueId: string; principalId: string | null; claimedAt: string | null; updatedAt: string }
export interface Task { taskId: string; caseId: string; title: string; description: string; type: string; priority: SupportCase['priority']; status: 'OPEN' | 'COMPLETED' | 'CANCELLED'; dueAt: string | null; actorPrincipalId: string; createdAt: string; updatedAt: string }
export interface RelatedCaseLink { caseId: string; relatedCaseId: string; relationship: string; reason: string; actorPrincipalId: string; createdAt: string }
export interface Interaction { interactionId: string; caseId: string; customerId: string; type: string; direction: string; summary: string; customerReached: boolean; actorPrincipalId: string; createdAt: string }
export interface Article { articleId: string; title: string; summary: string; content: string; category: string; tags: string[]; version: number; updatedAt: string }
export interface KnowledgeLink { caseId: string; articleId: string; reason: string; actorPrincipalId: string; createdAt: string }
export interface SlaPolicy { policyId: string; name: string; priority: SupportCase['priority']; responseMinutes: number; resolutionMinutes: number }
export interface TimelineEvent { eventId: string; caseId: string; action: string; actorPrincipalId: string; requestId: string; createdAt: string; metadata: Record<string, unknown> }

export interface InProgressIdempotency { state: 'IN_PROGRESS'; fingerprint: string; createdAt: number }
export interface CompletedIdempotency { state: 'COMPLETED'; fingerprint: string; status: number; body: Record<string, unknown>; headers: Record<string, string>; createdAt: number }
export type IdempotencyRecord = InProgressIdempotency | CompletedIdempotency;

export interface RunState {
  cases: Map<string, SupportCase>; notes: Map<string, Note>; evidence: Map<string, Evidence>;
  verifications: Map<string, VerificationRequest>; escalations: Map<string, Escalation>; tasks: Map<string, Task>;
  relatedCases: Map<string, RelatedCaseLink>; interactions: Map<string, Interaction>; knowledgeLinks: Map<string, KnowledgeLink>;
  events: TimelineEvent[]; idempotency: Map<string, IdempotencyRecord>; counters: Record<string, number>;
  clockSequence: number; lastAccessedAt: number;
}

export interface SupportConfig {
  nodeEnv: string; host: string; port: number; agentApiKey: string; adminApiKey: string;
  maxRuns: number; runTtlMs: number; idempotencyTtlMs: number; maxIdempotencyPerRun: number;
  rateLimitRequests: number; rateLimitWindowMs: number;
}

export interface ExecutionContext { runId: string; principal: Principal; requestId: string; params: Record<string, string>; query: Record<string, string | undefined>; body: Record<string, any> }
export interface ExecutionResult { status?: number; body: any; headers?: Record<string, string> }
