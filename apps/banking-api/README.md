# Intergalactic Banking API

Deterministic Express REST API for the Postman Fabric Gateway comparison demo. It exposes 56 operations across accounts, transactions, customers, beneficiaries, cards, payments, statements, FX, notifications, disputes, audit, credentials, and demo-run control.

## Quick start

```bash
npm install
npm run start --workspace=@intergalactic/banking-api
```

The API listens on `http://localhost:3000`. The generated OpenAPI 3.1 contract is available at `GET /openapi.yaml`.

## Authentication and headers

The seeded local credentials are deliberately different:

- Customer: `1234`
- Administrator: `admin-demo-key`

Credentials are SHA-256 hashed in storage and resolve to principals with `principalId`, `role`, and an optional `customerId`. Raw keys are returned only once by credential-creation operations and never enter domain records, audit events, DTOs, logs, or idempotency scopes.

| Header | Behavior |
|---|---|
| `X-API-Key` | Resolves the caller to a `CUSTOMER` or `ADMIN` principal. |
| `X-Demo-Run-Id` | Optional isolated namespace matching `[A-Za-z0-9_-]{1,64}`; defaults to `default`. |
| `X-Request-Id` | Optional correlation ID. A deterministic one is generated when omitted and always echoed. |
| `Idempotency-Key` | Required on every `POST`, `PUT`, `PATCH`, and `DELETE` operation in the maintained catalogue. |

The deprecated `GET /api/v1/auth` remains available only outside production. It creates a credential for the seeded customer and includes deprecation and successor headers. `POST /api/v1/admin/api-keys` requires the administrator credential and accepts either:

```json
{ "role": "ADMIN" }
```

or:

```json
{ "role": "CUSTOMER", "customerId": "CUS-1001" }
```

## Deterministic run model

Each valid, authenticated run begins from seed `fabric-banking-v2`. Invalid credentials cannot allocate runs. Runs have configurable capacity and idle expiration, and every run owns independent principals, credentials, accounts, transactions, disputes, payment resources, audit events, deterministic counters, a deterministic clock, and idempotency records.

The v2 fixture includes:

- Six accounts: three owned by Nova Newman and three counterparties across `COSMIC_COINS`, `GALAXY_GOLD`, and `MOON_BUCKS`.
- Nine immutable transactions covering payroll, purchases, transfers, a refund, and legacy transaction `1`.
- Suspicious transaction `TX-1042`, including status, beneficiary, channel, device trust, location, description, and timestamp.
- Four beneficiaries across trusted, pending, and inactive states; three cards across active and frozen states.
- Three scheduled payments, two standing orders, and three direct debits across active, scheduled, paused, and cancelled states.
- A resolved historical dispute for `TX-1008`, including customer-confirmation evidence, plus six audit events.

`TX-1042` deliberately has no Banking dispute at startup. It remains the live cross-service investigation for the Direct/Fabric comparison. The complete connected dataset is documented in `docs/Demo-Seed-Catalog.md`.

Equivalent action sequences in separate Direct and Fabric run IDs produce identical response bodies, resource IDs, timestamps, and pagination.

Reset a lane with the administrator key:

```bash
curl -X POST http://localhost:3000/api/v1/demo/runs/direct-demo/reset \
  -H 'X-API-Key: admin-demo-key' \
  -H 'Idempotency-Key: reset-direct-demo'
```

## Domain guarantees

- Monetary values are non-negative safe integers in minor units. The fictional currencies currently use exponent `0`.
- Transfers validate both active accounts, ownership, currency, and funds before balances and the immutable ledger entry are committed.
- Transactions are visible to an owner of either participating account; only the source owner may dispute an outgoing transfer.
- Beneficiaries transition through `PENDING_VERIFICATION`, `TRUSTED`, and `INACTIVE`; customers cannot self-assign trust.
- Cards allow only `ACTIVE → FROZEN`, `FROZEN → ACTIVE`, and `ACTIVE|FROZEN → REPLACED`.
- Scheduled payments require a future execution time. Standing orders require a trusted beneficiary, frequency, and next execution time. Direct debits require merchant and mandate details.
- Existing `DELETE` paths perform audited deactivation or cancellation rather than hard deletion.
- Customers can open disputes and attach evidence. Only administrators may transition dispute status.
- Audit entries are append-only and identify `actorPrincipalId`, never a credential.

Every collection is stably ordered and cursor-paginated with `limit` (default `25`, maximum `100`), optional opaque `cursor`, and `{ limit, nextCursor, hasMore }` metadata. Statement envelopes are `{ transactions, page }` or `{ accountId, transactions, page }`.

## Idempotency and rate limits

Idempotency is scoped by run, principal ID, operation ID, path parameters, normalized query, recursively canonicalized body, and key. Reservations use `IN_PROGRESS` and `COMPLETED` states. Exact retries replay the original sanitized status, headers, and body with `Idempotency-Replayed: true`; payload conflicts and concurrent duplicates return `409`. Records have a configurable TTL and per-run capacity.

Rate limits are scoped by run plus a one-way credential hash. Public routes fall back to run plus client IP. Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; `429` responses also include `Retry-After`.

## Contract and verification

Request schemas in `packages/banking-contract/schemas.js` are compiled by Ajv for runtime validation and reused by the OpenAPI generator. Public response schemas and canonical route metadata live in that shared workspace package. Do not hand-edit `apps/banking-api/openapi/openapi.yaml`.

```bash
npm run build:openapi --workspace=@intergalactic/banking-api
npm run check:openapi --workspace=@intergalactic/banking-api
npm run lint:openapi --workspace=@intergalactic/banking-api
npm run lint --workspace=@intergalactic/banking-api
npm run test --workspace=@intergalactic/banking-api
```

`npm run verify` runs the complete gate. The test suite executes all 56 operations, validates success responses against OpenAPI, checks Direct/Fabric parity, and enforces global coverage of 90% for statements, lines, and functions and 85% for branches.

Configuration variables:

- `PORT` (default `3000`)
- `DEMO_CUSTOMER_API_KEY` (default `1234`)
- `ADMIN_API_KEY` (default `admin-demo-key`)
- `API_KEY_DERIVATION_SECRET`
- `MAX_DEMO_RUNS` (default `100`)
- `DEMO_RUN_TTL_MS` (default `3600000`)
- `IDEMPOTENCY_TTL_MS` (default `900000`)
- `MAX_IDEMPOTENCY_RECORDS_PER_RUN` (default `1000`)
- `RATE_LIMIT_REQUESTS` (default `300`)
- `RATE_LIMIT_WINDOW_MS` (default `60000`)

The implementation remains CommonJS, Express, in-memory, and intentionally database-free for repeatable local demos. The sibling MCP server consumes the same shared contract.

## License

ISC
