# Intergalactic Banking, Fraud, and Support Platform

A deterministic Banking REST API and MCP server, Fraud REST API, and Support REST API and MCP server for comparing direct agent tool usage with the same task routed through Postman Fabric Gateway.

## Repository layout

```text
apps/
  banking-api/       Express REST API with 56 operations
  banking-mcp/       TypeScript Streamable HTTP MCP server with 50 customer tools
  fraud-api/         TypeScript REST API with deterministic fraud and retry behavior
  support-api/       TypeScript support case and investigation REST API
  support-mcp/       TypeScript Streamable HTTP MCP server with 53 support tools
packages/
  demo-fixtures/     Canonical cross-service seed scenarios and integrity checks
  banking-contract/  Shared operation metadata, JSON Schemas, and OpenAPI generator
  fraud-contract/    Shared Fraud operation metadata, schemas, and OpenAPI generator
  support-contract/  Shared Support operation metadata, schemas, and OpenAPI generator
```

Each REST API and its MCP server share a canonical contract. Tool schemas and names are generated from those contracts, so the MCP surfaces cannot silently drift from their APIs.

## Seeded demo world

Every authenticated run receives an independent copy of a coherent dataset: nine Banking transactions, three completed Fraud assessments, and five Support cases spanning the full lifecycle. Cross-service identifiers, amounts, currencies, and timestamps are validated by the shared `@intergalactic/demo-fixtures` package.

`CASE-2042` / `TX-1042` remains the primary live task. It begins with a customer report but no Banking dispute, Fraud assessment, or attached Support evidence, allowing the Direct and Fabric lanes to perform the same meaningful investigation. See the [Demo Seed Catalogue](docs/Demo-Seed-Catalog.md) for all starting records.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

This starts:

- Banking API: `http://127.0.0.1:3000`
- Banking MCP: `http://127.0.0.1:3100/mcp`
- Fraud API: `http://127.0.0.1:8080`
- Support API: `http://127.0.0.1:8090`
- Support MCP: `http://127.0.0.1:3200/mcp`

The local Banking MCP credential is `banking-mcp-demo-key`; the Support MCP credential is `support-mcp-demo-key`. Use either the canonical header:

```text
Authorization: Bearer <MCP credential>
```

or the API-key convenience header:

```text
X-API-Key: <MCP credential>
```

Each MCP credential is intentionally separate from its downstream API credential. The servers supply downstream credentials privately; they are absent from `tools/list`, tool arguments, results, and logs.

Use `X-Demo-Run-Id: direct-demo` or `fabric-demo` on the MCP request to isolate comparison lanes. Use the same `X-Request-Id` when replaying a logical action: the MCP server derives a deterministic downstream idempotency key from the request ID, operation, and canonical arguments.

## MCP surface

The server exposes 50 customer-safe tools across accounts, transactions, customers, beneficiaries, cards, scheduled payments, standing orders, direct debits, statements, FX, notification preferences, disputes, and audit events.

Administrative credential creation, demo reset, dispute status administration, service health, OpenAPI download, and legacy credential creation stay REST-only. In particular, the model cannot supply credentials, idempotency keys, or run identifiers as tool arguments.

Every result includes concise text plus structured JSON. Both Banking and Support MCP keep operational telemetry in server logs rather than adding custom result `_meta`; this avoids using agent context for data already captured by Fabric Gateway. Both direct MCP servers intentionally perform one downstream attempt, so Gateway-managed retries remain visible in the comparison.

The Fraud API remains REST-only so the comparison can demonstrate a mixed MCP and API task. It uses `fraud-demo-key` for business calls and a separate `fraud-admin-demo-key` for local fault, reset, and safe run-summary controls. See [Fraud API documentation](apps/fraud-api/README.md) and the [revised Fraud MVP specification](docs/Fraud-API-MVP-Spec.md).

The Support API contains 62 operations; its MCP publishes 53 contract-selected investigation tools. Its canonical `CASE-2042` fixture is linked to Banking transaction `TX-1042` and begins without Fraud evidence so the agent must perform the investigation. See [Support API documentation](apps/support-api/README.md), [Support MCP documentation](apps/support-mcp/README.md), the [Support API specification](docs/Support-API-Spec.md), and the [Demo Seed Catalogue](docs/Demo-Seed-Catalog.md).

See [Banking API documentation](apps/banking-api/README.md) and [Banking MCP documentation](apps/banking-mcp/README.md) for Banking details.

## Verification

```bash
npm run verify
```

This regenerates and checks all OpenAPI contracts, verifies the cross-service seed catalogue and all Banking and Support operation and tool catalogues, runs both MCP protocol suites, verifies Fraud retry behavior and cross-service lane determinism, enforces coverage thresholds, type-checks TypeScript, and builds the TypeScript services.

Configuration defaults are documented in [.env.example](.env.example). Production mode requires explicit credentials for Banking MCP/downstream access, Fraud, Support, and Support MCP/downstream access.
