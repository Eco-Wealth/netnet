# Unit N — Trade API v2 (Propose-only)

Adds `quote` + `plan` surfaces to `/api/agent/trade` while keeping PROPOSE_ONLY.

Done when:
- `GET /api/agent/trade?action=info` works
- `GET ...action=quote&from=USDC&to=REGEN&amountUsd=50` works
- `POST {action:'plan',...}` returns `requiresApproval: true` and a proof envelope

Notes:
- Policy is embedded as a conservative allowlist/cap set for now.
- Execution remains delegated to Bankr/OpenClaw.
