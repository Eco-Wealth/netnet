# Unit 45 — Governance / Permissions UX

Adds a Governance page at `/governance` that edits a safe-by-default policy:
- autonomy level (READ_ONLY / PROPOSE_ONLY / EXECUTE_WITH_LIMITS)
- USD caps (per day / per action)
- allowlists (tokens, venues, chains)
- kill switches (global + per-domain)

API:
- GET `/api/policy` returns `{ ok, policy }`
- POST `/api/policy` updates policy
  - dev: allowed by default
  - prod: requires OPERATOR_TOKEN + `x-operator-token` header

Policy store is in-memory for now; swap to persistence later.
