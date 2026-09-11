# Fabric Banking Demo Services

Local Banking, Fraud, and Support services for the Fabric Gateway comparison demo. It provides two MCP servers and three REST APIs with a deterministic shared dataset, so Direct and Fabric routes can run the same investigation against isolated data.

## Start here

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

That starts every service:

| Service | Local URL | Purpose |
| --- | --- | --- |
| Banking API | `http://127.0.0.1:3000` | Accounts, transactions, disputes, cards, payments, and FX |
| Banking MCP | `http://127.0.0.1:3100/mcp` | Customer-safe Banking tools for an agent |
| Fraud API | `http://127.0.0.1:8080` | Fraud assessments and the controlled retry scenario |
| Support API | `http://127.0.0.1:8090` | Customer cases, evidence, verifications, and notes |
| Support MCP | `http://127.0.0.1:3200/mcp` | Investigation tools for an agent |

To start just one service, use one of these instead:

```bash
npm run dev:api
npm run dev:mcp
npm run dev:fraud
npm run dev:support
npm run dev:support-mcp
```

## How it fits the Gateway demo

The comparison UI runs the same prompt two ways:

- **Direct** connects to Banking MCP, Support MCP, and Fraud API itself. The agent holds separate credentials.
- **Fabric** connects to one Fabric Gateway endpoint. Fabric holds and applies the upstream service credentials, and may expose a smaller or progressively discovered tool surface.

Both routes use a run ID such as `direct-...` or `fabric-...`. A run gets its own seeded data, so the two routes do not affect each other.

The main scenario begins with `CASE-2042`, linked to `TX-1042`. It is intentionally ready for an investigation: the agent can inspect the case and transaction, request a fraud assessment, add evidence, and request identity verification without starting from an empty system.

## Credentials for local development

These development-only values are the defaults in [`.env.example`](.env.example). Change them before deploying.

| Use | Credential | Header |
| --- | --- | --- |
| Banking API customer | `1234` | `X-API-Key` |
| Banking API admin | `admin-demo-key` | `X-API-Key` |
| Banking MCP | `banking-mcp-demo-key` | `Authorization: Bearer ...` or `X-API-Key` |
| Fraud API business | `fraud-demo-key` | `X-API-Key` |
| Fraud API demo admin | `fraud-admin-demo-key` | `X-API-Key` |
| Support API business | `support-demo-key` | `X-API-Key` |
| Support API admin | `support-admin-demo-key` | `X-API-Key` |
| Support MCP | `support-mcp-demo-key` | `Authorization: Bearer ...` or `X-API-Key` |

MCP credentials are separate from their downstream API credentials. The MCP servers apply their API credentials internally; an agent should never receive them in a tool schema or result.

## Try it

Check that the Banking API is available:

```bash
curl http://127.0.0.1:3000/health
```

Read the primary transaction in an isolated demo run:

```bash
curl \
  -H 'X-API-Key: 1234' \
  -H 'X-Demo-Run-Id: direct-example' \
  http://127.0.0.1:3000/api/v1/transactions/TX-1042
```

Connect an MCP client to `http://127.0.0.1:3100/mcp` or `http://127.0.0.1:3200/mcp` using the corresponding MCP credential above. Streamable HTTP MCP clients should send the credential on their connection request.

## Configuration and deployment

Copy the environment template when running services independently or outside the default local setup:

```bash
cp .env.example .env
```

`npm run dev` uses the local defaults. In production, set `NODE_ENV=production` and supply explicit, unique credentials and service URLs. The deployment service must listen on the platform-provided `PORT`; the individual service Dockerfiles and Railway service settings should select the appropriate app command:

```bash
npm run start:api
npm run start:mcp
npm run start:fraud
npm run start:support
npm run start:support-mcp
```

For MCP deployments, also set the relevant upstream URL: `BANKING_API_BASE_URL` for Banking MCP or `SUPPORT_API_BASE_URL` for Support MCP. See [`.env.example`](.env.example) for all available variables.

## Project layout

```text
apps/
  banking-api/    Banking REST API
  banking-mcp/    Banking Streamable HTTP MCP server
  fraud-api/      Fraud REST API
  support-api/    Support REST API
  support-mcp/    Support Streamable HTTP MCP server
packages/
  *-contract/     Route metadata, JSON Schemas, and OpenAPI generation
  demo-fixtures/  Shared seeded scenarios and integrity checks
```

REST APIs and their MCP servers share contracts. Tool names and schemas are generated from those contracts, preventing the MCP surface from drifting away from the API.

## Verify changes

```bash
npm run verify
```

This checks contracts and OpenAPI generation, seeded data, API and MCP tests, retry behavior, type safety, builds, and coverage.

For API-level detail, see the individual service readmes:

- [Banking API](apps/banking-api/README.md)
- [Banking MCP](apps/banking-mcp/README.md)
- [Fraud API](apps/fraud-api/README.md)
- [Support API](apps/support-api/README.md)
- [Support MCP](apps/support-mcp/README.md)
