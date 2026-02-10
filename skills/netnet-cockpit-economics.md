# netnet-cockpit — Economics (allocation planner)

Purpose: turn realized fees/profit into a **human-approvable** routing plan: operator payout + inference budget + micro-retire intent + treasury.

## Endpoint
- GET  `/api/agent/allocate` → info + default policy
- POST `/api/agent/allocate` → plan (no execution)

## POST (plan)
Request:
```json
{
  "action": "plan",
  "realizedFeesUsd": 25,
  "policy": {
    "operatorPct": 0.40,
    "inferencePct": 0.20,
    "microRetirePct": 0.10,
    "treasuryPct": 0.30,
    "minMicroRetireUsd": 0.50
  },
  "note": "weekly sweep"
}
```

Response:
```json
{
  "ok": true,
  "allocations": {
    "operatorUsd": 10,
    "inferenceUsd": 5,
    "microRetireUsd": 2.5,
    "treasuryUsd": 7.5
  },
  "nextAction": "OPERATOR_APPROVAL_REQUIRED"
}
```

Safety: this skill **never moves funds**. It outputs an approval packet that downstream execution skills may consume later.
