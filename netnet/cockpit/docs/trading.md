# Trading module (safe stub)

Status: **scaffold only**. This module exists to prove an interface and guardrails. It does not broadcast transactions.

## Environment flags

- `TRADE_ENABLED` (default: `false`)
  - If false: server forces DRY_RUN.
- `TRADE_MAX_USD` (default: `25`)
  - Hard cap enforced server-side.
- `TRADE_ALLOWLIST_TOKENS` (default: `USDC,ETH`)
  - Comma-separated symbol list (case-insensitive). Requests outside the allowlist are rejected.

## Agent endpoints

- `GET /api/agent/trade?action=info`
- `GET /api/agent/trade?action=quote&side=buy&tokenIn=USDC&tokenOut=ETH&amountUsd=10`
- `POST /api/agent/trade`
  - Body must include `beneficiaryName` and `reason`.
  - Defaults to DRY_RUN.

## UI

- Visit `/execute/paper` to use the paper-trade form.
