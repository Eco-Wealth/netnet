# Unit 32X — Program-level autonomy & policy engine

Adds:
- Central policy config (env override via `NETNET_POLICY_JSON`)
- Circuit breaker (pause/resume programs)
- `decide()` helper
- `/api/policy` endpoint (inspect + pause/resume)

Quick test:
- GET /api/policy
- POST /api/policy { "action":"pause", "programId":"TRADING_LOOP", "minutes":1 }
- POST /api/policy { "action":"resume", "programId":"TRADING_LOOP" }

Integration:
Import `decide()` from `@/lib/policy/decide` inside action routes and return its Decision envelope.
