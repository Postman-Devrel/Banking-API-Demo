# Intergalactic Support API

A deterministic, API-key-authenticated support case service for the Postman Fabric Gateway comparison. It owns support workflow state while Banking remains the transaction source of truth and Fraud remains the risk source of truth.

## Local use

```bash
npm install
npm run dev:support
```

The API listens on `http://127.0.0.1:8090`.

- Support agent key: `support-demo-key`
- Support administrator key: `support-admin-demo-key`

Protected calls use `X-API-Key`, `X-Demo-Run-Id`, and `X-Request-Id`. Every mutation also requires `Idempotency-Key`.

```bash
curl http://127.0.0.1:8090/v1/cases/CASE-2042 \
  -H 'X-API-Key: support-demo-key' \
  -H 'X-Demo-Run-Id: direct-demo'
```

The maintained OpenAPI 3.1 contract is served at `GET /openapi.yaml` and stored at `openapi/openapi.yaml`.

## Catalogue

The API exposes 62 operations across cases, notes, typed evidence, verification, escalations, lifecycle, assignments, queues, investigation tasks, related cases, interactions, knowledge, SLA, classification, and guidance. The contract marks 53 operations as `x-mcp-safe: true` for the Support MCP. Resolution, closure, credential creation, verification completion, and reset remain outside the model-facing surface.

Every run starts from `fabric-support-v2` with five connected cases:

- `CASE-2012`: a closed low-risk purchase confirmation.
- `CASE-2038`: an evidence-rich high-risk case escalated to Fraud.
- `CASE-2042`: the open primary demo investigation.
- `CASE-2055`: a resolved delayed-payroll case.
- `CASE-2060`: an account-access case awaiting customer verification.

The seed also includes notes, Banking and Fraud evidence, verification requests, an escalation, open and completed tasks, interactions, related-case links, knowledge links, timelines, seven knowledge articles, queues, and SLA policies. `CASE-2042` remains deliberately incomplete: it has the original customer statement but no Banking dispute, Fraud assessment, attached evidence, task, verification, or escalation. The agent must create and attach `FRA-90142` during the showcase.

## Reset

Local demo runs can be reset with the administrator key:

```bash
curl -X POST http://127.0.0.1:8090/_demo/v1/runs/direct-demo/reset \
  -H 'X-API-Key: support-admin-demo-key' \
  -H 'Idempotency-Key: reset-direct-demo'
```

Reset restores the complete five-case fixture and clears all run-specific mutations and previous idempotency state.

## Verification

```bash
npm run verify --workspace=@intergalactic/support-api
```
