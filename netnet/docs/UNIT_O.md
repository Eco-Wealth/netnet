# Unit O — Bankr Proposal Flow Upgrade (Propose-only)

Goal: Stabilize Bankr launch/token proposal packets with consistent cost/approval/proof envelope.

Done when:
- `/api/bankr/launch` and `/api/bankr/token/actions` return consistent shapes:
  - `requiresApproval: true`
  - `estimatedCosts` (usd + notes)
  - `proof` (netnet.proof.v1 envelope)
- Missing env vars are reported clearly (`BANKR_API_BASE_URL`).
