# Intergalactic Fraud API

A deterministic, API-key-authenticated REST service for comparing direct agent calls with calls routed through Postman Fabric Gateway. It evaluates fraud risk and recommends next steps; it never mutates Banking data or executes recommendations.

## Local use

From the repository root:

```bash
npm install
npm run dev:fraud
```

The service listens on `http://127.0.0.1:8080`. Local credentials are:

- Business API key: `fraud-demo-key`
- Demo administrator key: `fraud-admin-demo-key`

Business requests use `X-API-Key`, `X-Demo-Run-Id`, and `X-Request-Id`. Every mutation also requires an `Idempotency-Key`.

```bash
curl -X POST http://127.0.0.1:8080/v1/fraud/assessments \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: fraud-demo-key' \
  -H 'X-Demo-Run-Id: direct-demo' \
  -H 'X-Request-Id: request-1' \
  -H 'Idempotency-Key: assessment-TX-1042' \
  --data @apps/fraud-api/examples/tx-1042.json
```

The maintained OpenAPI 3.1 contract is served at `GET /openapi.yaml` and stored at `openapi/openapi.yaml`.

## Seeded assessments

Every authenticated run starts from `fabric-fraud-v2` with three completed examples:

- `FRA-55692` for `TX-1008`: low risk, score 5, `ALLOW`.
- `FRA-76469` for `TX-1038`: high risk, score 72, `REQUIRE_CUSTOMER_VERIFICATION`.
- `FRA-81139` for `TX-1055`: medium risk, score 30, `ALLOW`.

The records match Banking amounts, currencies, timestamps, and counterparties. `TX-1042` is intentionally not assessed at startup: creating it still produces canonical assessment `FRA-90142`, so the main demo retains a real Fraud step. Attempts, fault configuration, and idempotency records start empty.

## Deterministic retry scenario

Fault controls are available only outside production and require the administrator key:

```bash
curl -X PUT http://127.0.0.1:8080/_demo/v1/runs/direct-demo/faults \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: fraud-admin-demo-key' \
  -H 'Idempotency-Key: configure-direct-demo' \
  --data '{"failFirstAssessment":true}'
```

The first valid assessment attempt in that run returns `429` with `Retry-After: 1`; the second succeeds. The Fraud API never retries itself. This lets the direct lane expose the failure to the agent while Fabric Gateway can own a below-model retry. Use separate run IDs for isolation.

Reset a run with `POST /_demo/v1/runs/{runId}/reset`, also using the administrator key and an idempotency key. Reset restores the three seeded assessments and clears attempts, faults, and previous idempotency state.

The orchestration server can collect non-model-facing retry evidence with `GET /_demo/v1/runs/{runId}/summary` and the administrator key. The response contains the configured fault, sorted assessment IDs, total attempts, and per-transaction attempt counts. It contains no credential material. Like the other demo controls, this route is not mounted in production.

## Verification

```bash
npm run verify --workspace=@intergalactic/fraud-api
```

The suite checks generated-contract stability, OpenAPI linting, strict TypeScript, API behavior, response-schema conformance, secret non-disclosure, retry behavior, lane isolation, and coverage thresholds.
