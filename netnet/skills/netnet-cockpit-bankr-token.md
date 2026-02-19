# netnet — Bankr Token Lifecycle (proposal-only)

This skill exposes a stable surface for token lifecycle operations. It is **PROPOSE_ONLY** by default.

## Endpoints

- `GET /api/bankr/token/info` → read-only status (scaffold)
- `GET /api/bankr/token/actions` → catalog
- `POST /api/bankr/token/actions` → propose a plan + returns `netnet.proof.action.v1`

## Contract: POST /api/bankr/token/actions

Request:
```json
{ "action": "launch", "params": { "chain": "base", "name": "EcoWealth", "symbol": "ECO" } }
```

Response:
- `plan.whatWillHappen` (string)
- `plan.estimatedCosts` (string)
- `plan.requiresApproval` (true)
- `proof.schema` = `netnet.proof.action.v1`

## Notes

Wire real Bankr execution in Unit 30 and wallet read surfaces in Unit 42.
