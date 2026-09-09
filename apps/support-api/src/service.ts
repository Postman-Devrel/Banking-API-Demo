import { ApiError } from './errors.js';
import { paginate } from './pagination.js';
import { articles, queues, slaPolicies, SupportStore, supportTags } from './store.js';
import fixtures from '@intergalactic/demo-fixtures';
import { CredentialRegistry } from './auth.js';
import type { ExecutionContext, ExecutionResult, RunState, SupportCase, TimelineEvent } from './types.js';

const DEMO_NOW = Date.parse('2026-09-08T15:00:00.000Z');
const active = (supportCase: SupportCase) => supportCase.status !== 'CLOSED';

function sorted<T>(values: Iterable<T>, field: keyof T): T[] {
  return [...values].sort((left, right) => String(left[field]).localeCompare(String(right[field])));
}

export class SupportService {
  constructor(private readonly store: SupportStore, private readonly credentials: CredentialRegistry) {}

  private run(ctx: ExecutionContext): RunState { return this.store.getRun(ctx.runId); }
  private case(ctx: ExecutionContext, run = this.run(ctx)): SupportCase {
    const supportCase = run.cases.get(ctx.params.caseId || '');
    if (!supportCase) throw new ApiError(404, 'CASE_NOT_FOUND', 'The support case does not exist in this run');
    return supportCase;
  }
  private mutableCase(ctx: ExecutionContext, run = this.run(ctx)): SupportCase {
    const supportCase = this.case(ctx, run);
    if (supportCase.status === 'CLOSED') throw new ApiError(409, 'CASE_CLOSED', 'Closed cases cannot be changed');
    return supportCase;
  }
  private resource<T>(map: Map<string, T>, id: string | undefined, code: string, message: string): T {
    const value = map.get(id || ''); if (!value) throw new ApiError(404, code, message); return value;
  }
  private audit(run: RunState, ctx: ExecutionContext, caseId: string, action: string, metadata: Record<string, unknown>, createdAt: string): TimelineEvent {
    const event = { eventId: this.store.nextId(run, 'EVT'), caseId, action, actorPrincipalId: ctx.principal.principalId, requestId: ctx.requestId, createdAt, metadata: structuredClone(metadata) };
    run.events.push(event); return event;
  }
  private page<T>(items: T[], property: string, ctx: ExecutionContext): Record<string, unknown> {
    const result = paginate(items, ctx.query); return { [property]: result.items, page: result.page };
  }
  private touch(run: RunState, supportCase: SupportCase): string { const at = this.store.nextTimestamp(run); supportCase.updatedAt = at; return at; }

  execute(operationId: string, ctx: ExecutionContext): ExecutionResult {
    const run = operationId === 'resetSupportRun' ? undefined : this.run(ctx);
    switch (operationId) {
      case 'listCases': {
        let values = sorted(run!.cases.values(), 'caseId');
        for (const field of ['transactionId', 'customerId', 'status', 'priority', 'category', 'assignedQueueId'] as const) {
          if (ctx.query[field]) values = values.filter(value => String(value[field]) === ctx.query[field]);
        }
        return { body: this.page(values, 'cases', ctx) };
      }
      case 'createCase': {
        if ([...run!.cases.values()].some(value => value.transactionId === ctx.body.transactionId && active(value))) throw new ApiError(409, 'ACTIVE_CASE_EXISTS', 'An active case already exists for this transaction');
        const at = this.store.nextTimestamp(run!); const caseId = this.store.nextId(run!, 'CASE');
        const supportCase: SupportCase = {
          caseId, customerId: ctx.body.customerId, transactionId: ctx.body.transactionId, subject: ctx.body.subject,
          description: ctx.body.description || '', category: ctx.body.category, channel: ctx.body.channel, status: 'OPEN',
          priority: ctx.body.priority, tags: ctx.body.tags || [], assignedQueueId: 'QUEUE-PAYMENTS', assignedPrincipalId: null,
          verificationStatus: 'NOT_REQUESTED', resolution: null, createdAt: at, updatedAt: at
        };
        run!.cases.set(caseId, supportCase); this.audit(run!, ctx, caseId, 'CASE_CREATED', { transactionId: supportCase.transactionId }, at);
        return { body: structuredClone(supportCase), headers: { Location: `/v1/cases/${caseId}` } };
      }
      case 'getCase': return { body: structuredClone(this.case(ctx, run!)) as unknown as Record<string, unknown> };
      case 'updateCase': {
        const supportCase = this.mutableCase(ctx, run!);
        for (const field of ['subject', 'priority', 'tags'] as const) if (ctx.body[field] !== undefined) (supportCase as any)[field] = structuredClone(ctx.body[field]);
        const at = this.touch(run!, supportCase); this.audit(run!, ctx, supportCase.caseId, 'CASE_UPDATED', { fields: Object.keys(ctx.body).sort() }, at);
        return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'getCaseTimeline': {
        const supportCase = this.case(ctx, run!); const values = run!.events.filter(event => event.caseId === supportCase.caseId).sort((a, b) => a.eventId.localeCompare(b.eventId));
        return { body: this.page(values, 'events', ctx) };
      }
      case 'startCaseInvestigation': {
        const supportCase = this.mutableCase(ctx, run!);
        if (!['OPEN', 'ESCALATED'].includes(supportCase.status)) throw new ApiError(409, 'INVALID_CASE_TRANSITION', `Cannot start investigation from ${supportCase.status}`);
        supportCase.status = 'INVESTIGATING'; const at = this.touch(run!, supportCase);
        this.audit(run!, ctx, supportCase.caseId, 'INVESTIGATION_STARTED', { reason: ctx.body.reason }, at);
        return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'listCaseNotes': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.notes.values()].filter(value => value.caseId === supportCase.caseId), 'noteId'), 'notes', ctx) }; }
      case 'addCaseNote': {
        const supportCase = this.mutableCase(ctx, run!); const at = this.store.nextTimestamp(run!); const noteId = this.store.nextId(run!, 'NOTE');
        const note = { noteId, caseId: supportCase.caseId, type: ctx.body.type, content: ctx.body.content, actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.notes.set(noteId, note); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'NOTE_ADDED', { noteId, type: note.type }, at);
        return { body: structuredClone(note), headers: { Location: `/v1/cases/${supportCase.caseId}/notes/${noteId}` } };
      }
      case 'getCaseNote': { const supportCase = this.case(ctx, run!); const note = this.resource(run!.notes, ctx.params.noteId, 'NOTE_NOT_FOUND', 'The case note does not exist'); if (note.caseId !== supportCase.caseId) throw new ApiError(404, 'NOTE_NOT_FOUND', 'The case note does not exist'); return { body: structuredClone(note) }; }
      case 'listCaseEvidence': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.evidence.values()].filter(value => value.caseId === supportCase.caseId), 'evidenceId'), 'evidence', ctx) }; }
      case 'attachCaseEvidence': {
        const supportCase = this.mutableCase(ctx, run!);
        if ([...run!.evidence.values()].some(value => value.caseId === supportCase.caseId && value.type === ctx.body.type && value.referenceId === ctx.body.referenceId)) throw new ApiError(409, 'EVIDENCE_ALREADY_ATTACHED', 'This evidence is already attached');
        const at = this.store.nextTimestamp(run!); const evidenceId = this.store.nextId(run!, 'EVD');
        const evidence = { evidenceId, caseId: supportCase.caseId, type: ctx.body.type, referenceId: ctx.body.referenceId, source: ctx.body.source, summary: ctx.body.summary || '', facts: structuredClone(ctx.body.facts), actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.evidence.set(evidenceId, evidence); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'EVIDENCE_ATTACHED', { evidenceId, type: evidence.type, referenceId: evidence.referenceId }, at);
        return { body: structuredClone(evidence), headers: { Location: `/v1/cases/${supportCase.caseId}/evidence/${evidenceId}` } };
      }
      case 'getCaseEvidence': { const supportCase = this.case(ctx, run!); const evidence = this.resource(run!.evidence, ctx.params.evidenceId, 'EVIDENCE_NOT_FOUND', 'The evidence does not exist'); if (evidence.caseId !== supportCase.caseId) throw new ApiError(404, 'EVIDENCE_NOT_FOUND', 'The evidence does not exist'); return { body: structuredClone(evidence) }; }
      case 'listVerificationRequests': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.verifications.values()].filter(value => value.caseId === supportCase.caseId), 'verificationId'), 'verificationRequests', ctx) }; }
      case 'requestCustomerVerification': {
        const supportCase = this.mutableCase(ctx, run!);
        if ([...run!.verifications.values()].some(value => value.caseId === supportCase.caseId && value.status === 'PENDING')) throw new ApiError(409, 'VERIFICATION_ALREADY_PENDING', 'A customer verification request is already pending');
        const at = this.store.nextTimestamp(run!); const verificationId = this.store.nextId(run!, 'VER');
        const verification = { verificationId, caseId: supportCase.caseId, method: ctx.body.method, reason: ctx.body.reason, status: 'PENDING' as const, requestedByPrincipalId: ctx.principal.principalId, requestedAt: at, completedAt: null, completionNotes: null };
        run!.verifications.set(verificationId, verification); supportCase.status = 'AWAITING_CUSTOMER'; supportCase.verificationStatus = 'PENDING'; supportCase.updatedAt = at;
        this.audit(run!, ctx, supportCase.caseId, 'VERIFICATION_REQUESTED', { verificationId, method: verification.method }, at); return { body: structuredClone(verification) };
      }
      case 'completeVerificationRequest': {
        const supportCase = this.mutableCase(ctx, run!); const verification = this.resource(run!.verifications, ctx.params.verificationId, 'VERIFICATION_NOT_FOUND', 'The verification request does not exist');
        if (verification.caseId !== supportCase.caseId) throw new ApiError(404, 'VERIFICATION_NOT_FOUND', 'The verification request does not exist');
        if (verification.status !== 'PENDING') throw new ApiError(409, 'VERIFICATION_ALREADY_COMPLETED', 'The verification request is not pending');
        const at = this.store.nextTimestamp(run!); verification.status = ctx.body.outcome; verification.completedAt = at; verification.completionNotes = ctx.body.notes;
        supportCase.verificationStatus = ctx.body.outcome; supportCase.status = 'INVESTIGATING'; supportCase.updatedAt = at;
        this.audit(run!, ctx, supportCase.caseId, 'VERIFICATION_COMPLETED', { verificationId: verification.verificationId, outcome: verification.status }, at); return { body: structuredClone(verification) };
      }
      case 'listCaseEscalations': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.escalations.values()].filter(value => value.caseId === supportCase.caseId), 'escalationId'), 'escalations', ctx) }; }
      case 'escalateCase': {
        const supportCase = this.mutableCase(ctx, run!); const evidenceIds: string[] = ctx.body.evidenceIds || [];
        for (const id of evidenceIds) { const evidence = run!.evidence.get(id); if (!evidence || evidence.caseId !== supportCase.caseId) throw new ApiError(400, 'INVALID_EVIDENCE_REFERENCE', `Evidence ${id} is not attached to this case`); }
        const at = this.store.nextTimestamp(run!); const escalationId = this.store.nextId(run!, 'ESC');
        const escalation = { escalationId, caseId: supportCase.caseId, target: ctx.body.target, reason: ctx.body.reason, evidenceIds, status: 'OPEN' as const, actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.escalations.set(escalationId, escalation); supportCase.status = 'ESCALATED'; supportCase.assignedQueueId = this.queueForTarget(ctx.body.target); supportCase.assignedPrincipalId = null; supportCase.updatedAt = at;
        this.audit(run!, ctx, supportCase.caseId, 'CASE_ESCALATED', { escalationId, target: escalation.target }, at); return { body: structuredClone(escalation) };
      }
      case 'resolveCase': {
        const supportCase = this.mutableCase(ctx, run!); if (!['INVESTIGATING', 'AWAITING_CUSTOMER', 'ESCALATED'].includes(supportCase.status)) throw new ApiError(409, 'INVALID_CASE_TRANSITION', `Cannot resolve from ${supportCase.status}`);
        for (const id of ctx.body.evidenceIds as string[]) { const evidence = run!.evidence.get(id); if (!evidence || evidence.caseId !== supportCase.caseId) throw new ApiError(400, 'INVALID_EVIDENCE_REFERENCE', `Evidence ${id} is not attached to this case`); }
        const at = this.touch(run!, supportCase); supportCase.status = 'RESOLVED'; supportCase.resolution = { code: ctx.body.resolutionCode, summary: ctx.body.summary, resolvedAt: at };
        this.audit(run!, ctx, supportCase.caseId, 'CASE_RESOLVED', { resolutionCode: ctx.body.resolutionCode, evidenceIds: ctx.body.evidenceIds }, at); return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'closeCase': {
        const supportCase = this.case(ctx, run!); if (supportCase.status !== 'RESOLVED') throw new ApiError(409, 'INVALID_CASE_TRANSITION', 'Only resolved cases can be closed');
        const at = this.touch(run!, supportCase); supportCase.status = 'CLOSED'; this.audit(run!, ctx, supportCase.caseId, 'CASE_CLOSED', { reason: ctx.body.reason }, at); return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'reopenCase': {
        const supportCase = this.case(ctx, run!); if (supportCase.status !== 'CLOSED') throw new ApiError(409, 'INVALID_CASE_TRANSITION', 'Only closed cases can be reopened');
        const at = this.touch(run!, supportCase); supportCase.status = 'INVESTIGATING'; supportCase.resolution = null; this.audit(run!, ctx, supportCase.caseId, 'CASE_REOPENED', { reason: ctx.body.reason }, at); return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'listSupportQueues': return { body: this.page(queues, 'queues', ctx) };
      case 'getSupportQueue': { const queue = queues.find(value => value.queueId === ctx.params.queueId); if (!queue) throw new ApiError(404, 'QUEUE_NOT_FOUND', 'The support queue does not exist'); return { body: structuredClone(queue) as unknown as Record<string, unknown> }; }
      case 'getCaseAssignment': return { body: this.assignment(this.case(ctx, run!)) as unknown as Record<string, unknown> };
      case 'claimCase': {
        const supportCase = this.mutableCase(ctx, run!); if (supportCase.assignedPrincipalId && supportCase.assignedPrincipalId !== ctx.principal.principalId) throw new ApiError(409, 'CASE_ALREADY_CLAIMED', 'The case is already claimed');
        const at = this.touch(run!, supportCase); supportCase.assignedPrincipalId = ctx.principal.principalId; this.audit(run!, ctx, supportCase.caseId, 'CASE_CLAIMED', { reason: ctx.body.reason }, at); return { body: this.assignment(supportCase, at) as unknown as Record<string, unknown> };
      }
      case 'transferCase': {
        const supportCase = this.mutableCase(ctx, run!); const queue = queues.find(value => value.queueId === ctx.body.queueId && value.active); if (!queue) throw new ApiError(400, 'INVALID_QUEUE', 'The destination queue is unavailable');
        const at = this.touch(run!, supportCase); supportCase.assignedQueueId = queue.queueId; supportCase.assignedPrincipalId = null; this.audit(run!, ctx, supportCase.caseId, 'CASE_TRANSFERRED', { queueId: queue.queueId, reason: ctx.body.reason }, at); return { body: this.assignment(supportCase) as unknown as Record<string, unknown> };
      }
      case 'releaseCase': {
        const supportCase = this.mutableCase(ctx, run!); if (supportCase.assignedPrincipalId !== ctx.principal.principalId && ctx.principal.role !== 'SUPPORT_ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Only the assigned agent or an administrator can release this case');
        const at = this.touch(run!, supportCase); supportCase.assignedPrincipalId = null; this.audit(run!, ctx, supportCase.caseId, 'CASE_RELEASED', { reason: ctx.body.reason }, at); return { body: this.assignment(supportCase) as unknown as Record<string, unknown> };
      }
      case 'listCaseTasks': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.tasks.values()].filter(value => value.caseId === supportCase.caseId), 'taskId'), 'tasks', ctx) }; }
      case 'createCaseTask': {
        const supportCase = this.mutableCase(ctx, run!); const at = this.store.nextTimestamp(run!); const taskId = this.store.nextId(run!, 'TASK');
        const task = { taskId, caseId: supportCase.caseId, title: ctx.body.title, description: ctx.body.description || '', type: ctx.body.type, priority: ctx.body.priority, status: 'OPEN' as const, dueAt: ctx.body.dueAt || null, actorPrincipalId: ctx.principal.principalId, createdAt: at, updatedAt: at };
        run!.tasks.set(taskId, task); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'TASK_CREATED', { taskId, type: task.type }, at); return { body: structuredClone(task) };
      }
      case 'getCaseTask': return { body: structuredClone(this.caseResource(ctx, run!.tasks, ctx.params.taskId, 'TASK_NOT_FOUND', 'The case task does not exist')) };
      case 'updateCaseTask': {
        this.mutableCase(ctx, run!); const task = this.caseResource(ctx, run!.tasks, ctx.params.taskId, 'TASK_NOT_FOUND', 'The case task does not exist'); if (task.status !== 'OPEN') throw new ApiError(409, 'TASK_NOT_OPEN', 'Only open tasks can be updated');
        for (const field of ['title', 'description', 'priority', 'dueAt'] as const) if (ctx.body[field] !== undefined) (task as any)[field] = ctx.body[field];
        const at = this.store.nextTimestamp(run!); task.updatedAt = at; this.audit(run!, ctx, task.caseId, 'TASK_UPDATED', { taskId: task.taskId }, at); return { body: structuredClone(task) };
      }
      case 'completeCaseTask': return this.transitionTask(ctx, run!, 'COMPLETED', 'TASK_COMPLETED');
      case 'cancelCaseTask': return this.transitionTask(ctx, run!, 'CANCELLED', 'TASK_CANCELLED');
      case 'listRelatedCases': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.relatedCases.values()].filter(value => value.caseId === supportCase.caseId), 'relatedCaseId'), 'relatedCases', ctx) }; }
      case 'findDuplicateCases': { const supportCase = this.case(ctx, run!); const values = sorted([...run!.cases.values()].filter(value => value.caseId !== supportCase.caseId && (value.transactionId === supportCase.transactionId || value.customerId === supportCase.customerId)), 'caseId'); return { body: this.page(values, 'cases', ctx) }; }
      case 'linkRelatedCase': {
        const supportCase = this.mutableCase(ctx, run!); if (ctx.body.relatedCaseId === supportCase.caseId) throw new ApiError(400, 'INVALID_RELATED_CASE', 'A case cannot be related to itself');
        if (!run!.cases.has(ctx.body.relatedCaseId)) throw new ApiError(404, 'RELATED_CASE_NOT_FOUND', 'The related case does not exist');
        const key = `${supportCase.caseId}:${ctx.body.relatedCaseId}`; if (run!.relatedCases.has(key)) throw new ApiError(409, 'CASE_ALREADY_LINKED', 'The cases are already linked');
        const at = this.store.nextTimestamp(run!); const link = { caseId: supportCase.caseId, relatedCaseId: ctx.body.relatedCaseId, relationship: ctx.body.relationship, reason: ctx.body.reason, actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.relatedCases.set(key, link); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'RELATED_CASE_LINKED', { relatedCaseId: link.relatedCaseId, relationship: link.relationship }, at); return { body: structuredClone(link) };
      }
      case 'unlinkRelatedCase': {
        const supportCase = this.mutableCase(ctx, run!); const key = `${supportCase.caseId}:${ctx.params.relatedCaseId}`; if (!run!.relatedCases.delete(key)) throw new ApiError(404, 'RELATED_CASE_LINK_NOT_FOUND', 'The related-case link does not exist');
        const at = this.touch(run!, supportCase); this.audit(run!, ctx, supportCase.caseId, 'RELATED_CASE_UNLINKED', { relatedCaseId: ctx.params.relatedCaseId }, at); return { body: { removed: true, resourceId: ctx.params.relatedCaseId } };
      }
      case 'listCaseInteractions': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.interactions.values()].filter(value => value.caseId === supportCase.caseId), 'interactionId'), 'interactions', ctx) }; }
      case 'recordCaseInteraction': {
        const supportCase = this.mutableCase(ctx, run!); const at = this.store.nextTimestamp(run!); const interactionId = this.store.nextId(run!, 'INT');
        const interaction = { interactionId, caseId: supportCase.caseId, customerId: supportCase.customerId, type: ctx.body.type, direction: ctx.body.direction, summary: ctx.body.summary, customerReached: ctx.body.customerReached ?? false, actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.interactions.set(interactionId, interaction); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'INTERACTION_RECORDED', { interactionId, type: interaction.type, direction: interaction.direction }, at); return { body: structuredClone(interaction) };
      }
      case 'getCaseInteraction': return { body: structuredClone(this.caseResource(ctx, run!.interactions, ctx.params.interactionId, 'INTERACTION_NOT_FOUND', 'The interaction does not exist')) };
      case 'listCustomerInteractions': return { body: this.page(sorted([...run!.interactions.values()].filter(value => value.customerId === ctx.params.customerId), 'interactionId'), 'interactions', ctx) };
      case 'listCustomerCases': return { body: this.page(sorted([...run!.cases.values()].filter(value => value.customerId === ctx.params.customerId), 'caseId'), 'cases', ctx) };
      case 'searchKnowledgeArticles': { const q = (ctx.query.q || '').toLowerCase(); const values = articles.filter(value => !q || `${value.title} ${value.summary} ${value.category} ${value.tags.join(' ')}`.toLowerCase().includes(q)); return { body: this.page(values, 'articles', ctx) }; }
      case 'getKnowledgeArticle': { const article = articles.find(value => value.articleId === ctx.params.articleId); if (!article) throw new ApiError(404, 'ARTICLE_NOT_FOUND', 'The knowledge article does not exist'); return { body: structuredClone(article) as unknown as Record<string, unknown> }; }
      case 'recommendArticlesForCase': { const supportCase = this.case(ctx, run!); const values = articles.filter(value => value.category === supportCase.category || value.tags.some(tag => supportCase.tags.includes(tag) || tag === 'fraud')); return { body: this.page(values, 'articles', ctx) }; }
      case 'listLinkedArticles': { const supportCase = this.case(ctx, run!); return { body: this.page(sorted([...run!.knowledgeLinks.values()].filter(value => value.caseId === supportCase.caseId), 'articleId'), 'knowledgeLinks', ctx) }; }
      case 'linkKnowledgeArticle': {
        const supportCase = this.mutableCase(ctx, run!); if (!articles.some(value => value.articleId === ctx.body.articleId)) throw new ApiError(404, 'ARTICLE_NOT_FOUND', 'The knowledge article does not exist');
        const key = `${supportCase.caseId}:${ctx.body.articleId}`; if (run!.knowledgeLinks.has(key)) throw new ApiError(409, 'ARTICLE_ALREADY_LINKED', 'The article is already linked');
        const at = this.store.nextTimestamp(run!); const link = { caseId: supportCase.caseId, articleId: ctx.body.articleId, reason: ctx.body.reason, actorPrincipalId: ctx.principal.principalId, createdAt: at };
        run!.knowledgeLinks.set(key, link); supportCase.updatedAt = at; this.audit(run!, ctx, supportCase.caseId, 'KNOWLEDGE_ARTICLE_LINKED', { articleId: link.articleId }, at); return { body: structuredClone(link) };
      }
      case 'getCaseSla': return { body: this.caseSla(this.case(ctx, run!)) };
      case 'listSlaPolicies': return { body: this.page(slaPolicies, 'policies', ctx) };
      case 'getSlaPolicy': { const policy = slaPolicies.find(value => value.policyId === ctx.params.policyId); if (!policy) throw new ApiError(404, 'SLA_POLICY_NOT_FOUND', 'The SLA policy does not exist'); return { body: structuredClone(policy) as unknown as Record<string, unknown> }; }
      case 'assessCaseSlaRisk': {
        const supportCase = this.case(ctx, run!); const sla = this.caseSla(supportCase); const high = sla.state === 'BREACHED' || sla.state === 'AT_RISK';
        return { body: { caseId: supportCase.caseId, level: high ? 'HIGH' : supportCase.priority === 'HIGH' ? 'MEDIUM' : 'LOW', reasons: high ? ['The response or resolution deadline is near or breached.'] : ['The case is within its current SLA window.'], recommendedAction: high ? 'Prioritize the next required investigation action.' : 'Continue the standard investigation workflow.' } };
      }
      case 'listSupportTags': return { body: this.page(supportTags, 'tags', ctx) };
      case 'addCaseTag': {
        const supportCase = this.mutableCase(ctx, run!); if (!supportTags.includes(ctx.body.tag)) throw new ApiError(400, 'INVALID_TAG', 'The tag is not in the supported catalogue');
        if (!supportCase.tags.includes(ctx.body.tag)) supportCase.tags.push(ctx.body.tag); supportCase.tags.sort(); const at = this.touch(run!, supportCase); this.audit(run!, ctx, supportCase.caseId, 'TAG_ADDED', { tag: ctx.body.tag }, at); return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'removeCaseTag': {
        const supportCase = this.mutableCase(ctx, run!); const index = supportCase.tags.indexOf(ctx.params.tag || ''); if (index < 0) throw new ApiError(404, 'TAG_NOT_FOUND', 'The case does not have this tag');
        supportCase.tags.splice(index, 1); const at = this.touch(run!, supportCase); this.audit(run!, ctx, supportCase.caseId, 'TAG_REMOVED', { tag: ctx.params.tag }, at); return { body: structuredClone(supportCase) as unknown as Record<string, unknown> };
      }
      case 'classifyCase': {
        const supportCase = this.mutableCase(ctx, run!); supportCase.category = supportCase.transactionId ? 'UNRECOGNIZED_TRANSACTION' : 'OTHER'; supportCase.priority = supportCase.transactionId === 'TX-1042' ? 'HIGH' : 'MEDIUM';
        supportCase.tags = [...new Set([...supportCase.tags, 'disputed-transfer', 'fraud-review'])].sort(); const at = this.touch(run!, supportCase); this.audit(run!, ctx, supportCase.caseId, 'CASE_CLASSIFIED', { ruleVersion: 'support-rules-v1' }, at);
        return { body: { caseId: supportCase.caseId, category: supportCase.category, priority: supportCase.priority, tags: supportCase.tags, ruleVersion: 'support-rules-v1' } };
      }
      case 'listAvailableCaseActions': { const supportCase = this.case(ctx, run!); return { body: { caseId: supportCase.caseId, actions: this.availableActions(supportCase) } }; }
      case 'listMissingCaseEvidence': {
        const supportCase = this.case(ctx, run!); const present = new Set([...run!.evidence.values()].filter(value => value.caseId === supportCase.caseId).map(value => value.type));
        if ([...run!.notes.values()].some(value => value.caseId === supportCase.caseId && value.type === 'CUSTOMER_STATEMENT')) present.add('CUSTOMER_STATEMENT');
        const required = ['BANKING_TRANSACTION', 'FRAUD_ASSESSMENT', 'CUSTOMER_STATEMENT']; return { body: { caseId: supportCase.caseId, required: required.filter(value => !present.has(value)), present: [...present].sort() } };
      }
      case 'getInvestigationSummary': {
        const supportCase = this.case(ctx, run!); const evidence = [...run!.evidence.values()].filter(value => value.caseId === supportCase.caseId); const fraud = evidence.find(value => value.type === 'FRAUD_ASSESSMENT');
        const openTaskCount = [...run!.tasks.values()].filter(value => value.caseId === supportCase.caseId && value.status === 'OPEN').length;
        return { body: { caseId: supportCase.caseId, status: supportCase.status, risk: typeof fraud?.facts.riskLevel === 'string' ? fraud.facts.riskLevel : null, evidenceCount: evidence.length, openTaskCount, verificationStatus: supportCase.verificationStatus, nextBestAction: this.nextBestAction(run!, supportCase) } };
      }
      case 'getCaseChecklist': {
        const supportCase = this.case(ctx, run!); const evidenceTypes = new Set([...run!.evidence.values()].filter(value => value.caseId === supportCase.caseId).map(value => value.type));
        return { body: { caseId: supportCase.caseId, items: [
          { code: 'REVIEW_TRANSACTION', label: 'Review the Banking transaction', completed: evidenceTypes.has('BANKING_TRANSACTION') },
          { code: 'ASSESS_FRAUD', label: 'Obtain a Fraud assessment', completed: evidenceTypes.has('FRAUD_ASSESSMENT') },
          { code: 'RECORD_CUSTOMER_STATEMENT', label: 'Record the customer statement', completed: [...run!.notes.values()].some(value => value.caseId === supportCase.caseId && value.type === 'CUSTOMER_STATEMENT') },
          { code: 'REQUEST_VERIFICATION', label: 'Request customer verification when indicated', completed: supportCase.verificationStatus !== 'NOT_REQUESTED' }
        ] } };
      }
      case 'createSupportApiKey': {
        const created = this.credentials.create(ctx.body.role, ctx.body.displayName); const at = this.store.nextTimestamp(run!);
        return { body: { apiKey: created.apiKey, principalId: created.principal.principalId, role: created.principal.role, displayName: created.principal.displayName, createdAt: at } };
      }
      case 'resetSupportRun': {
        const reset = this.store.reset(ctx.runId); return { body: { runId: ctx.runId, seedVersion: fixtures.seedVersions.support, cases: reset.cases.size, events: reset.events.length } };
      }
      default: throw new ApiError(500, 'OPERATION_NOT_IMPLEMENTED', `Operation ${operationId} is not implemented`, true);
    }
  }

  private caseResource<T extends { caseId: string }>(ctx: ExecutionContext, map: Map<string, T>, id: string | undefined, code: string, message: string): T {
    const supportCase = this.case(ctx); const resource = this.resource(map, id, code, message); if (resource.caseId !== supportCase.caseId) throw new ApiError(404, code, message); return resource;
  }
  private queueForTarget(target: string): string { return ({ FRAUD_TEAM: 'QUEUE-FRAUD', PAYMENTS_OPERATIONS: 'QUEUE-PAYMENTS', COMPLIANCE: 'QUEUE-COMPLIANCE', SUPPORT_MANAGER: 'QUEUE-MANAGERS' } as Record<string, string>)[target] || 'QUEUE-PAYMENTS'; }
  private assignment(supportCase: SupportCase, claimedAt?: string) { return { caseId: supportCase.caseId, queueId: supportCase.assignedQueueId, principalId: supportCase.assignedPrincipalId, claimedAt: supportCase.assignedPrincipalId ? claimedAt || supportCase.updatedAt : null, updatedAt: supportCase.updatedAt }; }
  private transitionTask(ctx: ExecutionContext, run: RunState, status: 'COMPLETED' | 'CANCELLED', action: string): ExecutionResult {
    this.mutableCase(ctx, run); const task = this.caseResource(ctx, run.tasks, ctx.params.taskId, 'TASK_NOT_FOUND', 'The case task does not exist');
    if (task.status !== 'OPEN') throw new ApiError(409, 'TASK_NOT_OPEN', 'Only open tasks can transition'); const at = this.store.nextTimestamp(run); task.status = status; task.updatedAt = at;
    this.audit(run, ctx, task.caseId, action, { taskId: task.taskId, reason: ctx.body.reason }, at); return { body: structuredClone(task) };
  }
  private caseSla(supportCase: SupportCase): Record<string, unknown> {
    const policy = slaPolicies.find(value => value.priority === supportCase.priority)!; const created = Date.parse(supportCase.createdAt);
    const responseDue = created + policy.responseMinutes * 60_000; const resolutionDue = created + policy.resolutionMinutes * 60_000;
    const remainingMinutes = Math.floor((responseDue - DEMO_NOW) / 60_000); const state = supportCase.status === 'CLOSED' ? 'MET' : remainingMinutes < 0 ? 'BREACHED' : remainingMinutes <= 60 ? 'AT_RISK' : 'ON_TRACK';
    return { caseId: supportCase.caseId, policyId: policy.policyId, responseDueAt: new Date(responseDue).toISOString(), resolutionDueAt: new Date(resolutionDue).toISOString(), state, remainingMinutes };
  }
  private availableActions(supportCase: SupportCase): string[] {
    if (supportCase.status === 'CLOSED') return ['REOPEN_CASE'];
    const actions = ['ADD_NOTE', 'ATTACH_EVIDENCE', 'CREATE_TASK', 'RECORD_INTERACTION'];
    if (supportCase.status === 'OPEN' || supportCase.status === 'ESCALATED') actions.push('START_INVESTIGATION');
    if (supportCase.verificationStatus !== 'PENDING') actions.push('REQUEST_CUSTOMER_VERIFICATION');
    if (supportCase.status !== 'ESCALATED') actions.push('ESCALATE_CASE'); return actions.sort();
  }
  private nextBestAction(run: RunState, supportCase: SupportCase): string {
    const evidenceTypes = new Set([...run.evidence.values()].filter(value => value.caseId === supportCase.caseId).map(value => value.type));
    if (!evidenceTypes.has('BANKING_TRANSACTION')) return 'ATTACH_BANKING_TRANSACTION';
    if (!evidenceTypes.has('FRAUD_ASSESSMENT')) return 'ATTACH_FRAUD_ASSESSMENT';
    if (supportCase.verificationStatus === 'NOT_REQUESTED') return 'REQUEST_CUSTOMER_VERIFICATION';
    if (supportCase.status !== 'ESCALATED') return 'ESCALATE_CASE'; return 'AWAIT_SPECIALIST_REVIEW';
  }
}
