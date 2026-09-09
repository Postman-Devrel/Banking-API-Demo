# Intergalactic Banking Platform

## Purpose

This repository is the service monorepo for the Postman Fabric Gateway comparison showcase. It contains deterministic Banking, Fraud, and Support services plus customer-safe MCP facades for Banking and Support.

The comparison has two connection topologies:

- **Direct:** an agent connects to Banking MCP, Support MCP, and Fraud REST separately.
- **Fabric:** the same business capabilities are exposed through Postman Fabric Gateway, potentially using fewer curated, merged, or progressively disclosed tools.

Business parity matters; identical tool names or catalogue sizes do not.

## Runtime and repository layout

- Node.js 20 or newer
- npm workspaces
- Banking API: CommonJS JavaScript, Express 5
- Banking MCP: TypeScript, Streamable HTTP MCP
- Fraud API: TypeScript ESM, Express 5
- Support API: TypeScript ESM, Express 5
- Support MCP: TypeScript, Streamable HTTP MCP
- In-memory, deterministic, run-scoped storage

```text
apps/
  banking-api/       56-operation Banking REST API
  banking-mcp/       50-tool Banking MCP facade
  fraud-api/         Fraud REST API and controlled retry behavior
  support-api/       62-operation Support REST API
  support-mcp/       53-tool Support MCP facade
packages/
  demo-fixtures/     Canonical cross-service fixtures and integrity checks
  banking-contract/  Banking operations, schemas, and OpenAPI generation
  fraud-contract/    Fraud operations, schemas, and OpenAPI generation
  support-contract/  Support operations, schemas, and OpenAPI generation
```

Read the root `README.md` and the relevant application README before changing a service. See `.claude/docs/architectural_patterns.md` for implementation conventions.

## Source-of-truth order

When documentation and implementation disagree, use this order:

1. shared contract operation metadata and JSON Schemas;
2. current service source code;
3. automated tests;
4. generated OpenAPI;
5. README and specification prose;
6. legacy documents.

Do not restore behavior from an older plan or document without confirming it against the current implementation.

## Essential commands

From the repository root:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run verify
```

`npm run dev` starts:

| Service | Address |
|---|---|
| Banking API | `http://127.0.0.1:3000` |
| Banking MCP | `http://127.0.0.1:3100/mcp` |
| Fraud API | `http://127.0.0.1:8080` |
| Support API | `http://127.0.0.1:8090` |
| Support MCP | `http://127.0.0.1:3200/mcp` |

Individual scripts are `start:api`, `start:mcp`, `start:fraud`, `start:support`, `start:support-mcp` and their corresponding `dev:*` forms.

Use workspace commands while iterating:

```bash
npm run verify --workspace=@intergalactic/banking-api
npm run verify --workspace=@intergalactic/banking-mcp
npm run verify --workspace=@intergalactic/fraud-api
npm run verify --workspace=@intergalactic/support-api
npm run verify --workspace=@intergalactic/support-mcp
```

Run the root `npm run verify` before handing off a cross-service or contract change.

## Authentication

Local development credentials are intentionally separate:

| Boundary | Credential |
|---|---|
| Banking customer REST | `1234` |
| Banking administrator REST | `admin-demo-key` |
| Agent to Banking MCP | `banking-mcp-demo-key` |
| Fraud business REST | `fraud-demo-key` |
| Fraud demo administrator | `fraud-admin-demo-key` |
| Support agent REST | `support-demo-key` |
| Support administrator REST | `support-admin-demo-key` |
| Agent to Support MCP | `support-mcp-demo-key` |

REST APIs use `X-API-Key`. MCP servers use `Authorization: Bearer <key>` canonically and also accept `X-API-Key` for API-key-oriented clients.

MCP inbound credentials must differ from downstream REST credentials. MCP servers inject downstream credentials privately. Never expose credentials in tool definitions, tool arguments, tool results, DTOs, audit records, idempotency scopes, or logs.

Development defaults must not be usable silently in production.

## Request context and run isolation

Protected requests use:

- `X-API-Key` or MCP bearer authentication;
- optional `X-Demo-Run-Id`, matching `[A-Za-z0-9_-]{1,64}`;
- optional `X-Request-Id` for correlation;
- `Idempotency-Key` on every maintained mutation.

Each authenticated run receives an independent deterministic copy of the canonical fixture. Invalid credentials must be rejected before a run is allocated. Runs have capacity and idle-expiry controls.

Equivalent Direct and Fabric action sequences must produce identical business IDs, timestamps, ordering, pagination, and response bodies. Do not introduce wall-clock time, random IDs, unordered collection traversal, or shared mutable state into domain behavior.

## Canonical scenario and fixtures

Shared fixtures are maintained in `@intergalactic/demo-fixtures`.

The primary live scenario is:

- customer `CUS-1001`, Nova Newman;
- support case `CASE-2042`;
- Banking transaction `TX-1042`;
- `3,750 COSMIC_COINS` sent to Gary Galaxy;
- web channel, untrusted device, Europa Station;
- no Banking dispute initially;
- no Fraud assessment initially;
- creating the assessment yields `FRA-90142`, score 82, high risk, `REQUIRE_CUSTOMER_VERIFICATION`;
- Support initially contains the customer statement but not the Banking evidence, Fraud evidence, identity verification, or investigation summary.

Current seeds are `fabric-banking-v2`, `fabric-fraud-v2`, and `fabric-support-v2`. Update `packages/demo-fixtures`, `docs/Demo-Seed-Catalog.md`, service seed builders, and integrity tests together whenever shared facts change.

## Contract-driven development

Each service contract package owns:

- canonical operation metadata;
- request and response JSON Schemas;
- security and header declarations;
- operation IDs and tags;
- OpenAPI generation;
- MCP-safety selection where applicable.

Runtime validators and MCP catalogues reuse those definitions. Never hand-edit generated `openapi/openapi.yaml` files.

For a contract change:

1. change shared schemas and operation metadata;
2. update service behavior;
3. update MCP mapping if the operation is model-safe;
4. regenerate OpenAPI;
5. add request, response, authorization, idempotency, and protocol tests;
6. run the affected workspace verification and root verification.

Preserve operation IDs unless correcting an established contract defect. Tool names are derived from operation IDs.

## Banking domain rules

- API keys resolve to principals: `principalId`, `role`, and optional `customerId`.
- Money uses non-negative safe integers in minor units; current fictional currencies use exponent `0`.
- Transactions are immutable ledger entries.
- Transfers validate ownership, both active accounts, currency, and funds before committing balances and ledger atomically.
- A transaction is visible to the owner of either participating account.
- Only the source-account owner may dispute an outgoing transaction.
- Customers may create and inspect disputes and attach evidence; administrators own dispute status transitions.
- Beneficiaries use `PENDING_VERIFICATION`, `TRUSTED`, and `INACTIVE`; customers cannot self-assign trust.
- Card transitions are `ACTIVE -> FROZEN`, `FROZEN -> ACTIVE`, and `ACTIVE|FROZEN -> REPLACED`; no operations follow replacement.
- Scheduled payments require a future time.
- Standing orders require a trusted beneficiary, frequency, and next execution time.
- Direct debits require merchant and mandate details.
- `DELETE` routes perform audited cancellation or deactivation, not destructive history removal.
- Audit events are append-only and use `actorPrincipalId`, never credential material.

Route handlers should validate and delegate. Domain decisions belong in explicit services, persistence in domain repositories, and output shaping in public DTO mappers. Do not add generic CRUD, mass assignment, or direct mutation of repository map values.

## Pagination

All collections use stable cursor pagination:

- `limit` defaults to 25 and is capped at 100;
- omit `cursor` on the first page;
- copy the opaque `nextCursor` unchanged for the next page;
- return `{ limit, nextCursor, hasMore }` page metadata.

Never document a placeholder such as `cursor=string` as a usable value.

## Idempotency

Idempotency is scoped by run, authenticated principal, operation ID, path parameters, normalized query, recursively canonicalized body, and key.

Records transition from `IN_PROGRESS` to `COMPLETED`. Exact replays return the original sanitized status, headers, and body with `Idempotency-Replayed: true`. Payload conflicts and concurrent duplicates return `409`. Apply TTL and per-run capacity cleanup.

MCP tools must not accept an idempotency key. Derive it from the MCP request ID, operation, and canonical arguments. A replay must not advance deterministic clocks or counters.

## MCP conventions

Banking and Support MCP servers are stateless Streamable HTTP facades generated from their canonical contracts.

- Banking exposes 50 customer-safe tools.
- Support exposes 53 investigation-safe tools marked `x-mcp-safe: true`.
- Health, OpenAPI, credential creation, reset, and administrator-only transitions remain REST-only.
- Tool arguments contain business inputs only.
- Results contain concise text plus structured JSON.
- Do not add custom telemetry `_meta` to tool results.
- Keep HTTP status, latency, response size, request ID, replay state, and attempt count in structured logs.
- Each direct MCP server performs exactly one downstream attempt and must not retry.

The single-attempt rule preserves the comparison boundary: a Direct agent may see an upstream failure, while Fabric Gateway may retry below the model boundary.

## Fraud retry behavior

Fraud is intentionally REST-only. Its non-production administrator controls can enable a deterministic fail-first assessment:

1. first valid assessment attempt returns `429` with `Retry-After: 1`;
2. second equivalent attempt succeeds;
3. the Fraud API never retries itself.

`GET /_demo/v1/runs/{runId}/summary` provides safe, non-model-facing attempt evidence. Fault, summary, and reset routes require `fraud-admin-demo-key` locally and must not be mounted in production.

## Security and public responses

- Authenticate before allocating runs or parsing privileged context.
- Use explicit public DTO mappers rather than blacklist redaction.
- Repository methods return safe copies, not mutable map references.
- Use writable-field allowlists for every command.
- Raw generated API keys are returned once only from credential-creation endpoints.
- Preserve defense-in-depth credential scanning in tests.
- Never put raw Fraud scores, private Support notes, or credential data into customer-facing responses.

## Testing expectations

Tests should cover more than happy paths. For every mutation, cover validation, authorization, illegal transitions, exact replay, conflicting replay, and concurrent duplicate behavior. For financial operations, cover atomic rollback, inactive accounts, insufficient funds, ownership, and concurrency.

Contract tests must verify runtime responses against declared OpenAPI schemas. MCP tests must verify authentication, tool catalogue generation, argument validation, downstream headers, no hidden retry, structured results, and secret non-disclosure.

Preserve Direct/Fabric determinism tests and cross-service fixture integrity tests.

## Documentation rules

- OpenAPI is the sole maintained external API contract; no Postman collection update is required by default.
- Keep root and application READMEs aligned with implemented behavior.
- Keep `docs/Demo-Seed-Catalog.md` aligned with all seed changes.
- Keep demo controls clearly marked non-production and non-model-facing.
- Document operational metadata as internal where it is not meaningful to API consumers.

## Working safely

- Preserve unrelated user changes in a dirty worktree.
- Do not replace deterministic in-memory behavior with a database unless explicitly requested.
- Do not create commits unless explicitly requested.
- Do not broaden an MCP catalogue merely because a REST operation exists; model safety is an explicit contract decision.
- Avoid compatibility shims that bypass authorization, validation, idempotency, or domain transitions.
