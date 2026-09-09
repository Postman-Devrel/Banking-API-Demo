# Support API Specification

**Status:** Implemented
**Version:** 1.0
**Seed:** `fabric-support-v2`

## Purpose

The Support API owns deterministic support-case and investigation state for the Postman Fabric Gateway side-by-side demo. Banking owns accounts, transactions, and disputes. Fraud owns advisory risk assessments. Support stores typed snapshots and provenance supplied by an authorized caller; it does not call those services itself.

The API records customer-contact activity but sends no messages. It cannot execute Banking operations or treat a Fraud score as proof of fraud.

## Seeded workspace and canonical fixture

Every new run contains five cases spanning `OPEN`, `ESCALATED`, `AWAITING_CUSTOMER`, `RESOLVED`, and `CLOSED`. Their linked Banking transactions and seeded Fraud evidence come from the shared `@intergalactic/demo-fixtures` catalogue. The workspace includes representative notes, evidence, verification, escalation, tasks, interactions, related cases, knowledge links, and timelines rather than empty collections.

`CASE-2042`, linked to `CUS-1001` and `TX-1042`, remains the canonical live workflow. The subject is “Unrecognized transfer to Gary Galaxy”. It begins `OPEN`, `HIGH` priority, in `QUEUE-PAYMENTS`, with a customer statement and inbound-call record. Customer verification is `NOT_REQUESTED`; no Banking or Fraud evidence is pre-attached. No Banking dispute or Fraud assessment for `TX-1042` exists at startup.

All domain identifiers and timestamps advance from deterministic per-run counters and a fixed demo clock. Equivalent Direct and Fabric command sequences therefore produce identical business responses.

## Authentication

Protected endpoints require `X-API-Key`. Local keys are `support-demo-key` for `SUPPORT_AGENT` and `support-admin-demo-key` for `SUPPORT_ADMIN`. Production requires explicit distinct values. Generated credentials are stored only as digests; raw generated keys are returned by the creation response only.

Agents can investigate, attach evidence, create tasks and notes, request verification, route work, and escalate. Only administrators can complete verification, resolve, close, reopen, create credentials, and reset local runs.

## Request context and state

`X-Demo-Run-Id` matches `[A-Za-z0-9_-]{1,64}` and defaults to `default`. `X-Request-Id` is accepted and echoed or generated. Invalid credentials cannot allocate runs. Runs, idle lifetime, and idempotency records are bounded and cleaned up.

Every mutation requires `Idempotency-Key`. A key is scoped by run, principal, operation, path, normalized query, and canonical body. It moves through `IN_PROGRESS` and `COMPLETED`. Exact replay returns the original sanitized status, headers, and body with `Idempotency-Replayed: true`; conflicts and concurrent duplicates return `409`. Replays never advance the demo clock, identifiers, or audit history.

## Lifecycle

```text
OPEN -> INVESTIGATING -> AWAITING_CUSTOMER
                     \-> ESCALATED -> INVESTIGATING
INVESTIGATING|AWAITING_CUSTOMER|ESCALATED -> RESOLVED -> CLOSED
CLOSED -> INVESTIGATING (administrator reopen only)
```

Generic updates cannot change status. Resolution requires referenced evidence attached to the same case. Closed cases are immutable until reopened.

## Domains

The 62-operation REST catalogue covers:

- case creation, search, retrieval, safe updates, timeline, and investigation start;
- append-only notes and immutable typed evidence;
- verification requests and administrator completion;
- escalations and restricted lifecycle commands;
- support queues, claim, transfer, and release;
- investigation task creation and transitions;
- duplicate discovery and related-case links;
- recorded customer interactions;
- seeded knowledge search, recommendations, and links;
- deterministic SLA policies and risk;
- controlled tags and rule-based classification;
- available actions, missing evidence, investigation summary, and checklist;
- credential creation and local run reset.

Collections use opaque cursor pagination with a default limit of 25 and maximum of 100. Responses contain `{ <resource>: [], page: { limit, nextCursor, hasMore } }`.

## MCP boundary

The canonical operation catalogue marks 53 customer-safe tools using `x-mcp-safe: true`. The Support MCP derives its tools from those operations and keeps credentials, run IDs, idempotency keys, administrative lifecycle, credential creation, verification completion, and reset outside model arguments.

## Security and observability

Shared strict JSON Schemas reject unknown fields, mass assignment, invalid typed evidence, and bodies over 64 KiB. Logs contain operation, request/run IDs, status, duration, case ID, authentication outcome, and replay status. They exclude headers, bodies, credentials, and unrestricted customer data. Audit events identify principals, never credentials.

The API emits ordinary REST responses and no gateway-specific `_meta`; Fabric Gateway and the comparison harness own gateway telemetry.

## Quality gates

The maintained OpenAPI 3.1 document is generated from operation metadata and shared schemas, linted with zero findings, and checked for generation stability. Tests cover all operation families, canonical fixtures, Direct/Fabric determinism, authorization, lifecycle rules, evidence integrity, idempotency, pagination, rate limiting, production configuration, secret non-disclosure, and response-schema conformance. Coverage thresholds are 90% statements/functions/lines and 85% branches.
