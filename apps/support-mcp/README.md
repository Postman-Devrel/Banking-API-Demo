# Intergalactic Support MCP

An API-key-authenticated, stateless Streamable HTTP MCP facade over the deterministic Intergalactic Support REST API.

## Surface and trust boundary

The server generates 53 tools from `@intergalactic/support-contract`. It includes customer-support investigation, evidence, assignment, task, related-case, interaction, knowledge, SLA, classification, and guidance operations.

Administrative credential creation, demo reset, case creation, verification completion, and final case lifecycle transitions remain REST-only. Credentials, run IDs, request IDs, and idempotency keys are server-managed and never appear as tool arguments.

The direct MCP server performs exactly one downstream request. It emits status, latency, response size, attempt count, and replay information only to structured server logs; it does not add custom `_meta` telemetry to tool definitions or results. This keeps the direct lane's tool context representative while allowing the Gateway's own telemetry to measure the Fabric lane.

## Configuration

| Variable | Default | Purpose |
|---|---:|---|
| `SUPPORT_MCP_HOST` | `127.0.0.1` | Bind host |
| `SUPPORT_MCP_PORT` | `3200` | Bind port |
| `SUPPORT_MCP_API_KEY` | `support-mcp-demo-key` | Inbound MCP credential |
| `SUPPORT_API_BASE_URL` | `http://127.0.0.1:8090` | Downstream Support REST API |
| `SUPPORT_API_KEY` | `support-demo-key` | Private downstream Support credential |
| `DEFAULT_SUPPORT_DEMO_RUN_ID` | `default` | Run namespace used when the header is absent |
| `SUPPORT_API_TIMEOUT_MS` | `10000` | Downstream request timeout |

Development credential defaults are forbidden when `NODE_ENV=production`, and the inbound and downstream keys must differ.

## Request headers

- `Authorization: Bearer <SUPPORT_MCP_API_KEY>` is canonical; `X-API-Key` is also accepted.
- `X-Demo-Run-Id` selects an isolated Support API namespace and must match `[A-Za-z0-9_-]{1,64}`.
- `X-Request-Id` correlates the MCP and REST calls. For mutations, it contributes to the deterministic downstream idempotency key. One is generated if omitted.

Authentication runs before request-context parsing or downstream access.

## Run

Build the Support API and MCP first, then start both services:

```bash
npm run build --workspace=@intergalactic/support-api
npm run build --workspace=@intergalactic/support-mcp
npm run start:support
npm run start:support-mcp
```

The MCP endpoint is `http://127.0.0.1:3200/mcp`; health is available at `/health`.

## Verify and measure

```bash
npm run verify --workspace=@intergalactic/support-mcp
npm run catalog:stats --workspace=@intergalactic/support-mcp
```

The catalogue measurement reports the serialized tool/schema bytes and a deterministic approximate-token baseline, making tool-context reduction directly measurable in the Gateway showcase.
