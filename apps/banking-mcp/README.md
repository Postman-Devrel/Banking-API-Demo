# Intergalactic Banking MCP

An API-key-authenticated, stateless Streamable HTTP MCP facade over the Intergalactic Banking REST API.

## Configuration

| Variable | Default | Purpose |
|---|---:|---|
| `MCP_HOST` | `127.0.0.1` | Bind host |
| `MCP_PORT` | `3100` | Bind port |
| `MCP_API_KEY` | `banking-mcp-demo-key` | Inbound MCP credential |
| `BANKING_API_BASE_URL` | `http://127.0.0.1:3000` | Downstream REST API |
| `BANKING_API_KEY` | `1234` | Private downstream customer credential |
| `DEFAULT_DEMO_RUN_ID` | `default` | Run namespace when the request header is absent |
| `BANKING_API_TIMEOUT_MS` | `10000` | Downstream timeout |

Development defaults are disabled for credentials when `NODE_ENV=production`.

## Request headers

- `Authorization: Bearer <MCP_API_KEY>` is canonical. `X-API-Key` is also accepted for clients that expose API-key auth directly.
- `X-Demo-Run-Id` selects an isolated REST API namespace and must match `[A-Za-z0-9_-]{1,64}`.
- `X-Request-Id` correlates the MCP call with the downstream API call and makes mutation idempotency deterministic. One is generated when omitted.

Authentication happens before request-context validation or downstream access. No request retries occur inside this server; `attempts` is therefore `1`, allowing Gateway-managed retries to remain measurable.

Tool results contain customer-safe structured data only. HTTP status, latency, response size, correlation, and idempotency replay remain in structured server logs; the MCP server does not add custom result `_meta` telemetry to agent-visible calls.

## Scripts

```bash
npm run dev --workspace=@intergalactic/banking-mcp
npm run verify --workspace=@intergalactic/banking-mcp
npm run start --workspace=@intergalactic/banking-mcp
```

`start` runs the compiled output, so run `npm run build` first.
