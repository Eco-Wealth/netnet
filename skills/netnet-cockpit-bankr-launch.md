# netnet-cockpit — Bankr Token Launcher (Propose-only)

Purpose: generate an operator-approved proposal packet to launch a token via Bankr.

## Endpoint
- `GET /api/bankr/launch` — contract + safety
- `POST /api/bankr/launch` — create proposal packet

## Safety posture
- PROPOSE_ONLY by default
- Always requires operator approval
- Output always includes:
  - what will happen
  - estimated costs (best-effort)
  - requires approval = true

## Example (proposal)
POST body:
```json
{
  "name": "vealth",
  "symbol": "VEALTH",
  "chain": "base",
  "initialLiquidityUsd": 250,
  "notes": "Experiment: self-paying agent loop",
  "operator": { "id": "brawlaphant", "reason": "Pilot launch for fee-funded inference + micro-retire" }
}
```

Response:
- `proposal.whatWillHappen[]`
- `proposal.estimatedCosts`
- `proposal.proofIntent` (attach to proof-of-action)

## Next steps
1) Operator reviews proposal, confirms chain + symbol + intent.
2) Operator executes launch via Bankr tooling.
3) Record result (token address / tx hash / links) into proof object (Unit 19) and fee routing policy (Unit 38).
