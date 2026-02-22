# netnet-cockpit — Kumbaya Connector Skill Contract

Canonical Kumbaya connector contract for Operator-driven posting workflows.

## Route ownership

- `GET|POST /api/agent/kumbaya`

## Canonical action

- `kumbaya.post.content`

## Semantics

- `info`: read connector capabilities and safety posture.
- `plan`: proposal-only post plan with proof envelope.
- `execute`: gated write path through Privy wallet transaction send.

Execution remains gated by Operator approval, execution intent lock, planning, and policy checks.

## Proposal envelope example

```json
{
  "type": "skill.proposal",
  "skillId": "kumbaya.agent",
  "route": "/api/agent/kumbaya",
  "reasoning": "Draft a Kumbaya post proposal for operator review.",
  "proposedBody": {
    "action": "kumbaya.post.content",
    "content": "VEALTH operations update with treasury and governance notes.",
    "walletProfileId": "vealth-kumbaya"
  },
  "riskLevel": "medium"
}
```
