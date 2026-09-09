# Fraud API MVP Specification

**Status:** Implemented
**Version:** 1.1
**Purpose:** Deterministic upstream REST service for the Postman Fabric Gateway side-by-side demonstration

## 1. Summary

The Fraud API evaluates a payment transaction and returns evidence, a risk classification, and advisory next steps. It cannot change Banking data, resolve disputes, contact customers, issue refunds, or execute its recommendations.

The Direct and Fabric lanes must receive identical business results. The comparison concerns authentication binding, retry ownership, tool exposure, and model-context consumption—not different fraud decisions.

## 2. Alignment with the Banking fixture

Version 1.1 uses the canonical Banking fixture instead of the unrelated customer, GBP, card, and merchant values in the draft:

| Property | Canonical value |
| --- | --- |
| Transaction | `TX-1042` |
| Customer | `CUS-1001` |
| Amount | `3750` minor units |
| Currency | `COSMIC_COINS` |
| Occurred at | `2026-08-29T21:14:00.000Z` |
| Beneficiary | Gary Galaxy, account `2` |
| Payment method | `bank_transfer` |
| Transaction channel | `WEB` |
| Device trusted | `false` |
| Location | `Europa Station` |

Money is a positive safe integer in minor units. The initial fictional currencies use exponent `0`, matching the Banking API.

## 3. API surface

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Service health |
| `GET` | `/openapi.yaml` | None | Maintained OpenAPI 3.1 contract |
| `POST` | `/v1/fraud/assessments` | Business or admin key | Create or retrieve an assessment |
| `GET` | `/v1/fraud/assessments/{assessmentId}` | Business or admin key | Retrieve a created assessment |
| `PUT` | `/_demo/v1/runs/{runId}/faults` | Admin key | Configure the local fail-first scenario |
| `POST` | `/_demo/v1/runs/{runId}/reset` | Admin key | Restore a local run to the deterministic seed |

The `/_demo` endpoints are not mounted when `NODE_ENV=production`.

## 4. Authentication and request context

Protected requests use `X-API-Key`. Local defaults are `fraud-demo-key` for business operations and `fraud-admin-demo-key` for demo controls. Production requires explicit, distinct values.

`X-Demo-Run-Id` selects isolated state and defaults to `default`. It must match `[A-Za-z0-9_-]{1,64}`. `X-Request-Id` is accepted and echoed, or generated when omitted. Unknown runs are allocated only after authentication and operation validation require state.

Raw credentials are compared using constant-time digest comparison and are never stored in run state, DTOs, error bodies, or structured logs.

## 5. Create an assessment

Every run begins from `fabric-fraud-v2` with completed low-, medium-, and high-risk assessments for `TX-1008`, `TX-1055`, and `TX-1038`. Those examples are cross-checked against the Banking seed and used by the populated Support workspace. `TX-1042` is deliberately not pre-assessed, so the canonical request below remains a live demo operation. Run attempt counters, fault settings, and idempotency records start empty.

`POST /v1/fraud/assessments` requires `Content-Type: application/json` and `Idempotency-Key`.

```json
{
  "transactionId": "TX-1042",
  "customerId": "CUS-1001",
  "amount": 3750,
  "currency": "COSMIC_COINS",
  "occurredAt": "2026-08-29T21:14:00.000Z",
  "beneficiary": { "name": "Gary Galaxy", "accountId": "2" },
  "payment": { "method": "bank_transfer" },
  "context": {
    "customerDisputed": true,
    "reviewChannel": "support_case",
    "transactionChannel": "WEB",
    "deviceTrusted": false,
    "location": "Europa Station"
  }
}
```

Unknown fields are rejected. `payment.cardPresent` is required only for `card` payments. Supported currencies are `COSMIC_COINS`, `GALAXY_GOLD`, and `MOON_BUCKS`.

The canonical response is deterministic:

```json
{
  "assessmentId": "FRA-90142",
  "transactionId": "TX-1042",
  "risk": { "score": 82, "level": "high" },
  "signals": [
    { "code": "NEW_DEVICE", "severity": "medium", "description": "Transaction originated from a device not previously trusted by the customer." },
    { "code": "UNUSUAL_AMOUNT", "severity": "high", "description": "Amount is significantly higher than the customer’s normal transaction range." },
    { "code": "LOCATION_MISMATCH", "severity": "high", "description": "Transaction location differs from the customer’s recent activity." }
  ],
  "recommendation": {
    "action": "REQUIRE_CUSTOMER_VERIFICATION",
    "permittedActions": ["REQUEST_IDENTITY_VERIFICATION", "ESCALATE_TO_FRAUD_TEAM"],
    "prohibitedActions": ["ISSUE_IMMEDIATE_REFUND", "CLOSE_DISPUTE_AS_RESOLVED"],
    "reason": "Multiple high-severity indicators require verification before the dispute can be resolved."
  },
  "model": { "name": "demo-fraud-risk-model", "version": "1.1.0" },
  "assessedAt": "2026-09-08T15:30:00.000Z"
}
```

New assessments return `201` and `Location`. An identical assessment submitted under a new idempotency key returns `200`. Exact replay returns the original status, headers, and body with `Idempotency-Replayed: true`.

`PLACE_TEMPORARY_HOLD` is intentionally absent from executable actions because the Banking MCP has no corresponding customer-safe tool.

## 6. Idempotency

Every mutation requires a key of 1–128 characters. Scope includes run ID, authenticated principal, operation, path parameters, and recursively canonicalized input. The API:

1. checks for exact replay before advancing the attempt counter;
2. reports payload reuse as `409 IDEMPOTENCY_CONFLICT`;
3. reserves accepted keys as `IN_PROGRESS` before state mutation;
4. reports concurrent duplicates as `409 IDEMPOTENCY_IN_PROGRESS`;
5. stores the sanitized original status, headers, and body as `COMPLETED`;
6. expires records by TTL and enforces a per-run capacity.

The injected `429` occurs before reservation, so the same key can be retried.

## 7. Deterministic failure and retry ownership

Fault injection is configured through the administrator-only local control route, never through a model-controlled business header. When `failFirstAssessment` is enabled, the first valid assessment attempt for each transaction in that run returns:

- HTTP `429`;
- `Retry-After: 1`;
- `X-Fraud-Attempt: 1`;
- `error.retryable: true`;
- `error.retryAfterMs: 1000`.

The second attempt succeeds with `X-Fraud-Attempt: 2`. Attempt and assessment state are isolated by run. The service communicates retryability but never retries itself. The direct client or agent owns a direct-lane retry; Fabric Gateway may own a configured below-model retry in the gateway lane.

## 8. Risk behavior

Risk bands are `low` 0–29, `medium` 30–59, `high` 60–84, and `critical` 85–100. `TX-1042` always returns the fixed result above. Other valid inputs use a deterministic rules model and transaction-derived assessment ID; neither random values nor wall-clock time affect business output.

The assessment is advisory. A permitted action means only that fraud policy does not prohibit it; the Banking MCP still owns authorization and execution.

## 9. Errors

All non-2xx responses use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body does not match the operation schema",
    "retryable": false,
    "requestId": "REQ-FRAUD-001",
    "details": [{ "field": "/amount", "issue": "must be >= 1" }]
  }
}
```

Documented variants include `400` validation or fixture mismatch, `401` authentication, `403` authorization, `404` missing assessment or route, `409` idempotency/input conflict, `429` injected rate limit, `500` unexpected failure, and `503` bounded-storage capacity.

## 10. Security, bounds, and observability

- Strict shared JSON Schemas reject unknown fields and oversized input; JSON bodies are limited to 64 KiB.
- Run count, run idle TTL, idempotency TTL, and idempotency records per run are configurable and bounded.
- Stored objects are copied across repository boundaries.
- Structured request logs contain request/run IDs, route, method, status, duration, transaction/assessment IDs where applicable, attempt, fault flag, and authentication outcome—never request headers, bodies, or credentials.
- API telemetry remains in logs and the comparison harness. The Fraud response does not add proprietary `_meta`; Fabric Gateway owns its own telemetry.
- Non-local deployment requires TLS at the ingress or gateway.

## 11. Acceptance criteria

The implementation is complete when generated OpenAPI is stable and lint-clean; all endpoints conform to shared schemas; Direct and Fabric runs produce identical outcomes; fail-first behavior is independently repeatable; credentials never appear in responses or logs; demo controls are unavailable in production; and statements/functions/lines coverage is at least 90% with branches at least 85%.

## 12. Out of scope

Production model inference or training, real payment data, case management, banking action execution, asynchronous or batch assessment, webhooks, manual-review queues, an MCP wrapper for Fraud, a scenario editor, and production rate-limit design are out of scope.
