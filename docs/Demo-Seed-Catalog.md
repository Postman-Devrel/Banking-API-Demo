# Demo Seed Catalogue

All authenticated demo runs begin from the same deterministic cross-service dataset. The canonical source is `packages/demo-fixtures`; service stores convert those records into their own domain models and return fresh copies for every run.

## Primary showcase scenario

`CASE-2042` is the deliberate starting point for the Gateway comparison:

- Customer `CUS-1001` (`Nova Newman`) reported Banking transaction `TX-1042`.
- `TX-1042` is a posted transfer of `3750 COSMIC_COINS` to `Gary Galaxy`, initiated from an untrusted device at `Europa Station`.
- No Banking dispute exists yet.
- No Fraud assessment exists yet; a live assessment deterministically creates `FRA-90142`.
- Support contains the original customer statement, but no attached transaction or Fraud evidence, verification request, escalation, or investigation task.

This preserves a repeatable multi-system task while the rest of the seed provides realistic context.

## Banking seed: `fabric-banking-v2`

- 2 customers and 3 customer-visible accounts across all fictional currencies.
- 3 counterparty accounts, including Gary Galaxy, Red Dust Commerce, and Titan Payroll Services.
- 9 immutable transactions covering salary deposits, purchases, transfers, and a refund.
- 4 beneficiaries in trusted, pending-verification, and inactive states.
- 3 cards in active and frozen states.
- 3 scheduled payments, 2 standing orders, and 3 direct debits across active, scheduled, paused, and cancelled states.
- 1 resolved historical dispute with evidence and 6 audit events.

## Fraud seed: `fabric-fraud-v2`

| Assessment | Transaction | Risk | Recommendation |
|---|---|---:|---|
| `FRA-55692` | `TX-1008` | 5 / low | `ALLOW` |
| `FRA-76469` | `TX-1038` | 72 / high | `REQUIRE_CUSTOMER_VERIFICATION` |
| `FRA-81139` | `TX-1055` | 30 / medium | `ALLOW` |

Attempt counters and fault controls still start clean. `TX-1042` is intentionally absent.

## Support seed: `fabric-support-v2`

| Case | Transaction | State | Purpose |
|---|---|---|---|
| `CASE-2012` | `TX-1008` | `CLOSED` | Completed low-risk purchase confirmation |
| `CASE-2038` | `TX-1038` | `ESCALATED` | Evidence-rich high-risk Fraud example |
| `CASE-2042` | `TX-1042` | `OPEN` | Primary live investigation |
| `CASE-2055` | `TX-1055` | `RESOLVED` | Reconciled delayed-payroll example |
| `CASE-2060` | `TX-1060` | `AWAITING_CUSTOMER` | Pending identity-verification example |

The cases are accompanied by 6 notes, 6 evidence records, 3 verification requests, 1 escalation, 4 tasks, 7 interactions, related-case and knowledge links, 13 timeline events, 7 knowledge articles, 4 queues, and 4 SLA policies.

## Run behavior

Direct and Fabric run IDs receive independent copies of this dataset. Reset restores the complete seed and clears run-specific attempts, mutations, idempotency records, and fault configuration. Equivalent action sequences continue to produce identical IDs and timestamps.
