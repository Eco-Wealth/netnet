# netnet-cockpit — Revenue (read-only)

Purpose: give a simple, verifiable rollup of whether the agent is paying for itself.

## Endpoint
- GET `/api/agent/revenue?action=info`
- GET `/api/agent/revenue?action=report&days=7`

## Safety
- Read-only.
- No funds movement.
- Designed to work even if the accounting module drifts (best-effort compat).

## What to return to the operator
Always present:
- Realized fees (USD)
- Inference spend estimate (USD)
- Micro-retire intent (USD)
- Net (USD)
- Any notes about missing revenue / cost drift

## Example (report)
```json
{
  "ok": true,
  "windowDays": 7,
  "totals": {
    "inferredUsdSpend": 0.35,
    "realizedFeesUsd": 2.10,
    "microRetireUsd": 0.10,
    "netUsd": 1.65
  },
  "incentives": { "treasuryBps": 5000, "operatorBps": 2000, "inferenceBps": 2000, "microRetireBps": 1000 },
  "sources": { "ledger": "compat" },
  "notes": ["Ledger compat mode: revenue is a best-effort rollup."]
}
```
