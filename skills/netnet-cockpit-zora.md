# netnet-cockpit — Zora Connector Skill Contract

Canonical Zora connector contract for Operator-driven posting workflows.

## Route ownership

- `GET|POST /api/agent/zora`

## Canonical action

- `zora.post.content`

## Semantics

- `info`: read connector capabilities and safety posture.
- `plan`: proposal-only post plan with proof envelope.
- `execute`: gated write path through Privy wallet transaction send.

Execution remains gated by Operator approval, execution intent lock, planning, and policy checks.

## Proposal envelope example

```json
{
  "type": "skill.proposal",
  "skillId": "zora.agent",
  "route": "/api/agent/zora",
  "reasoning": "Draft a Zora post proposal for operator review.",
  "proposedBody": {
    "action": "zora.post.content",
    "content": "Daily stewardship update: water, habitat, and biodiversity milestones.",
    "walletProfileId": "ecowealth-zora"
  },
  "riskLevel": "medium"
}
```
