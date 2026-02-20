# Security & Policy Audit Playbook

Output goal: A human (or agent) can read the audit output and know exactly what to fix next.

## Checklist (operator)
- Kill switches:
  - execution kill switch present and enabled
  - spend kill switch present and enabled
- Autonomy:
  - default READ_ONLY / PROPOSE_ONLY unless explicitly set
- Spend caps:
  - max/day
  - max/trade
  - per-action caps where relevant
- Allowlist:
  - tokens
  - venues
  - chains
  - actions

## Runtime hygiene
- Non-root container user
- No secrets committed; env via `.env` files or secrets manager
- Logs available (stdout/stderr)
- Health endpoint responds

## Proof spine
- Every action emits a proof object (planned/approved/executed)
- Proof links attachable to work items

## When something fails
- If build fails: fix compile blockers first
- If runtime fails: check `/api/health`, then logs, then env presence
