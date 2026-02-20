# Unit 51 — Ops Runbook + Operator Console (minimal)

## Purpose
Make day-2 operations predictable: how to run locally, how to validate endpoints, how to interpret common failures, and a tiny UI page that links to the key health/proof/agent surfaces.

## Local run
From repo root:
- Install: `npm install`
- Dev: `npm run dev`

Cockpit runs at: `http://localhost:3000`

## Quick endpoint checks
- Health: `curl -i http://localhost:3000/api/health`
- Carbon agent info: `curl -i "http://localhost:3000/api/agent/carbon?action=info"`
- Trade agent info: `curl -i "http://localhost:3000/api/agent/trade?action=info"`
- Proof paid (expected 402 unless configured): `curl -i http://localhost:3000/api/proof-paid`
- Proof paid, authorized local token:
  `curl -i -H "x-netnet-paid-token: $X402_DEV_PAID_TOKEN" http://localhost:3000/api/proof-paid`

## Common issues
### 1) 404 on all routes
- Confirm App Router path exists at `netnet/cockpit/src/app`
- Ensure the project is being run from the correct folder: `netnet/cockpit`
- If you previously used a symlink `app -> src/app`, remove it and restart (prefer canonical `src/app`).

### 2) /api/proof-paid returns unexpected status
- Route should not return 500 in normal operation.
- If it returns 503, set `X402_PAY_TO` (or set `X402_DEV_BYPASS=true` for local-only bypass).
- If it returns 402, payment/authorization has not been provided yet.

### 3) Peer-deps install errors
- Confirm `netnet/cockpit/package.json` and lockfile are committed together.
- Use plain `npm install`; no legacy peer flag is required.

### 4) Bridge routes return 502/504
- Check `error.details.source` to identify the failing upstream surface.
- If `error.details.retryable=true`, treat as transient and retry.
- Cockpit should remain usable; continue read-only/proposal flows while Bridge recovers.

## Operator Console
Visit: `/ops`
It provides one-click links to core pages and JSON endpoints used during demos/debugging.
