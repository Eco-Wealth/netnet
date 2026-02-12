# netnet-cockpit — Bankr Skill Contract

Canonical Bankr skill contract for Operator-driven flows in `netnet/cockpit`.

## Route ownership

- `GET /api/bankr/token/info`
- `GET /api/bankr/wallet`
- `GET|POST /api/bankr/token/actions`
- `GET|POST /api/bankr/launch`

## Semantics

- `info`: read-only state/metadata fetch (`/token/info`, `/wallet`).
- `quote`: read-only evaluation output where supported by Bankr-compatible actions.
- `plan`: propose-only planning output for next-step actions (`/token/actions`, `/launch`).

Execution remains gated by Operator approval, execution intent lock, plan generation, and policy checks.

## Proposal envelope example

Use the Operator `skill.proposal` JSON shape:

```json
{
  "type": "skill.proposal",
  "skillId": "bankr.agent",
  "route": "/api/bankr/token/actions",
  "reasoning": "Generate a conservative Bankr token action plan for operator review.",
  "proposedBody": {
    "action": "bankr.token.actions",
    "chain": "base",
    "token": "ECO",
    "amountUsd": 100
  },
  "riskLevel": "medium"
}
```

Notes:
- Keep proposals deterministic and auditable.
- Do not auto-execute from proposal generation.
