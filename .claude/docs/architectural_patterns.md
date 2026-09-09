# Architectural Patterns and Decisions

This document describes the architecture currently implemented in the Intergalactic Banking Platform monorepo. It replaces the original single-service CRUD description.

## 1. System boundaries

The monorepo contains three business domains and two MCP facades:

```text
Banking MCP -> Banking API -> Banking run store
Support MCP -> Support API -> Support run store
Orchestrator/API client -> Fraud API -> Fraud run store
```

Banking is the financial source of truth. Fraud is an advisory risk engine. Support owns customer case workflow. Cross-domain identifiers are coordinated by shared fixtures, but services do not reach into one another's stores.

## 2. Contract-first architecture

The contract packages are the central design boundary:

```text
canonical operation metadata + JSON Schemas
                  |
       +----------+----------+
       |          |          |
 runtime Ajv   OpenAPI 3.1   MCP catalogue
 validation    generation    generation
```

An operation definition includes its method, path, operation ID, tags, security, input schemas, response schemas, and whether it is MCP-safe. This removes duplicated route/tool descriptions.

Generated OpenAPI is an artifact. Change the contract package and regenerate; do not edit YAML by hand.

## 3. Request pipeline

The precise middleware composition differs by service, but protected requests follow this conceptual pipeline:

```text
request
  -> correlation/run context validation
  -> authentication and principal resolution
  -> rate limiting
  -> request-schema validation
  -> idempotency reservation for mutations
  -> route/controller
  -> domain service
  -> repository/run store
  -> public DTO mapping
  -> response-schema validation in tests
  -> structured logging/error mapping
```

Authentication must occur before an unknown run can be allocated. Cross-cutting middleware should not contain business-domain transitions.

## 4. Run-scoped stores

Each service uses a top-level run registry. A run is selected by `X-Demo-Run-Id`, defaults to `default`, and is seeded only after successful authentication.

A run owns:

- domain maps and indexes;
- deterministic counters;
- a deterministic clock;
- credentials/principals where applicable;
- idempotency reservations;
- attempt and fault state where applicable;
- last-access time for idle expiration.

Run stores enforce maximum run count and idle cleanup. Domain repositories must not expose their mutable maps. Return structured clones or explicit copies.

The store is intentionally in memory. Restarting a service discards mutations. This is a feature of the repeatable local demo, not production persistence.

## 5. Deterministic identity and time

IDs and timestamps derive from per-run fixture state, counters, and the demo clock. Domain code must not use random UUIDs or the wall clock for business records.

This property is required for fair comparison: separate Direct and Fabric namespaces executing the same logical commands should produce the same business outputs.

Idempotent replay must return the stored result without incrementing a counter or advancing the demo clock.

## 6. Identity and authorization

Banking credentials resolve to a principal:

```text
principalId
role: CUSTOMER | ADMIN
customerId?: string
```

Credential values are SHA-256 hashed in storage. Domain records and audit events carry `principalId`, never an API key. API-key generation returns raw key material once, then only retains the hash.

Authorization belongs at the command/query boundary and must be repeated when a resource changes:

- list and get queries apply visibility rules;
- commands verify ownership of referenced resources;
- updates revalidate funding accounts, beneficiaries, amounts, currencies, and lifecycle states;
- only administrators perform privileged transitions.

## 7. Explicit services instead of generic CRUD

The Banking API uses domain-specific services for customers, beneficiaries, cards, scheduled payments, standing orders, direct debits, transactions/statements, FX, notifications, disputes, and audit.

Route handlers should:

1. read validated request data;
2. call one explicit service operation;
3. map the result into a declared public response.

Services enforce business rules and coordinate repositories. Repositories persist and retrieve safe copies. DTO mappers define exactly which fields leave the service.

Do not use generic object-spread updates from request bodies. Every command has a writable-field allowlist.

## 8. Financial transaction boundary

Transfers are one atomic domain operation:

```text
validate source exists and is active
  -> validate destination exists and is active
  -> authorize source ownership
  -> validate currencies and amount
  -> validate sufficient funds
  -> calculate both resulting balances
  -> commit both balances and immutable ledger entry together
```

No balance may change if any validation or commit step fails. Ledger entries are immutable. Deactivation never removes transaction history.

Money is stored as non-negative safe integers in minor units. Fictional currencies currently use exponent `0`. FX uses rational rates and an explicit deterministic rounding policy.

## 9. Lifecycle state machines

State transitions are commands, not arbitrary field updates.

### Cards

```text
ACTIVE -> FROZEN
FROZEN -> ACTIVE
ACTIVE | FROZEN -> REPLACED
REPLACED -> no further transition
```

### Beneficiaries

```text
PENDING_VERIFICATION -> TRUSTED   administrator-controlled
PENDING_VERIFICATION | TRUSTED -> INACTIVE
```

Customers cannot self-assign trust.

### Payments

- scheduled payments require a future execution time;
- standing orders require a trusted beneficiary, frequency, and next execution time;
- direct debits require merchant and mandate details;
- update commands revalidate all referenced resources and lifecycle rules;
- delete paths translate into cancellation or deactivation events.

### Disputes

Customers may create disputes, inspect them, and attach evidence. Only administrators may transition dispute status. Ledger transactions remain unchanged by dispute workflow.

### Support cases

Support separates investigation, evidence, verification, escalation, assignment, tasks, and final lifecycle actions. Final resolution/closure and verification completion remain administrator-controlled and outside the MCP catalogue.

## 10. Idempotency reservation pattern

Every maintained mutation uses a shared reservation flow:

```text
canonical identity =
  run + principal + operationId + path + normalized query + canonical body + key

lookup key
  -> absent: reserve IN_PROGRESS
  -> same identity, IN_PROGRESS: 409
  -> different identity: 409
  -> same identity, COMPLETED: replay stored response

execute operation
  -> store sanitized status, selected headers, and body as COMPLETED
  -> release or retain retryable state according to failure semantics
```

Canonical JSON must recursively sort object keys. Array order remains meaningful. Reservations have TTL and per-run capacity.

## 11. Stable cursor pagination

Collections use deterministic ordering before pagination. Cursors are opaque encodings of stable position, not arbitrary client strings.

Response metadata is:

```json
{
  "limit": 25,
  "nextCursor": "opaque-or-null",
  "hasMore": false
}
```

The first request omits `cursor`; subsequent requests reuse `nextCursor` verbatim. Filters and sort order must be stable for the cursor sequence.

## 12. Public DTO pattern

Responses use explicit mapping functions rather than serializing domain maps or redacting a blacklist after the fact.

DTOs must exclude:

- raw or hashed credentials;
- credential-shaped ownership fields;
- internal repository state;
- private audit implementation details;
- any field absent from the declared public response schema.

Secret scanning remains defense in depth, not the primary output-control mechanism.

## 13. MCP facade pattern

Banking MCP and Support MCP share the same architecture:

```text
Streamable HTTP request
  -> authenticate MCP credential
  -> validate run/request context
  -> tools/list from canonical contract
  -> validate tool arguments
  -> inject downstream REST credential and headers
  -> derive idempotency for mutations
  -> make exactly one REST attempt
  -> map REST success/error to concise text + structuredContent
  -> log operational telemetry outside the result
```

MCP tool arguments contain only business inputs. The model cannot set credentials, run IDs, correlation IDs, or idempotency keys.

Tool names derive from operation IDs:

- `banking_<snake_case_operation_id>`;
- `support_<snake_case_operation_id>`.

Downstream output schemas are retained for validation/evidence but are not enlarged with custom telemetry. Do not add result `_meta` for status, latency, bytes, retries, correlation, or replay; the gateway and orchestrator collect those signals independently.

## 14. Retry ownership boundary

Direct MCP facades and the Fraud API never retry business calls. This is deliberate.

The controlled Fraud fault returns a first `429` and a subsequent success. Therefore:

- Direct: one Fraud attempt reaches the model as an error; the agent may request one retry.
- Fabric: the gateway may make two upstream attempts while returning one success to the model.

Do not add SDK or server retries that blur this boundary. Transport retries, if any, must be explicit, narrowly scoped, and separately observable.

## 15. Append-only audit pattern

Audit events are ordered, append-only records. They identify the actor by `actorPrincipalId` and describe the domain operation without embedding credentials. Pagination preserves deterministic order.

Lifecycle cancellation, deactivation, evidence attachment, and privileged transitions should create appropriate audit/timeline records rather than rewriting history invisibly.

## 16. Error contract

Validation, authentication, authorization, not-found, conflict, rate-limit, and server failures must map to declared error schemas. Correlation IDs are included where the contract declares them.

Rate-limit responses include `Retry-After`. Banking also returns its declared `X-RateLimit-*` headers. Never leak stack traces or secrets through public errors.

## 17. Adding or changing an operation

1. Determine the owning domain and whether the capability is REST-only or MCP-safe.
2. Add or change reusable JSON Schemas in the relevant contract package.
3. Add canonical operation metadata, including exact security, headers, responses, examples, tags, and operation ID.
4. Implement an explicit service command/query and repository methods returning copies.
5. Keep the route thin and apply common middleware.
6. Add explicit DTO mapping.
7. If MCP-safe, verify generated tool name, input schema, annotations, and downstream mapping.
8. Regenerate OpenAPI and verify the generated tree is clean.
9. Test success, validation, authorization, state transitions, idempotency replay/conflict/concurrency, response conformance, and secret non-disclosure.
10. Run the affected workspace verification and root `npm run verify`.

## 18. Adding or changing fixture data

1. Change canonical facts in `packages/demo-fixtures`.
2. Update each owning service's seed builder.
3. Preserve referential integrity across Banking transaction, Fraud assessment, and Support case/evidence records.
4. Update `docs/Demo-Seed-Catalog.md`.
5. Test reset restoration and Direct/Fabric determinism.
6. Ensure the primary `CASE-2042` scenario still starts in the intended incomplete state unless the scenario itself is being redesigned.

## 19. Test architecture

The verification suite combines:

- schema and contract generation-stability tests;
- OpenAPI linting and response conformance;
- unit tests for domain and cross-cutting behavior;
- full operation-matrix integration tests;
- MCP protocol, authentication, catalogue, and mapping tests;
- idempotency replay/conflict/concurrent-duplicate tests;
- run isolation and expiry tests;
- deterministic parity tests;
- fault and retry-boundary tests;
- credential non-disclosure tests;
- cross-service fixture integrity checks;
- configured coverage thresholds.

Avoid tests that reach into mutable repository maps when a public command/query can establish behavior. Use deterministic run IDs per test and reset or isolate state explicitly.

## 20. Patterns to avoid

- hand-edited generated OpenAPI;
- route-level business logic duplicated across endpoints;
- generic CRUD services or mass assignment;
- API keys used as ownership identifiers;
- mutable repository objects escaping their boundary;
- random domain IDs or wall-clock timestamps;
- retries hidden in Direct MCP or Fraud clients;
- administrative operations marked MCP-safe;
- operational telemetry in agent-visible `_meta`;
- hard deletion of financial or audit history;
- cursor examples that imply the literal value `string` is valid;
- a Postman collection treated as more authoritative than OpenAPI.
