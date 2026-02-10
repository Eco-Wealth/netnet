# Unit 51 — Ops Runbook + Operator Console (minimal)

## Purpose
Make day-2 operations predictable: how to run locally, how to validate endpoints, how to interpret common failures, and a tiny UI page that links to the key health/proof/agent surfaces.

## Local run
From repo root:
- Install: `npm install --legacy-peer-deps`
- Dev: `npm run dev`

Cockpit runs at: `http://localhost:3000`

## Quick endpoint checks
- Health: `curl -i http://localhost:3000/api/health`
- Carbon agent info: `curl -i "http://localhost:3000/api/agent/carbon?action=info"`
- Trade agent info: `curl -i "http://localhost:3000/api/agent/trade?action=info"`
- Proof paid (expected 402 unless configured): `curl -i http://localhost:3000/api/proof-paid`

## Common issues
### 1) 404 on all routes
- Confirm App Router path exists at `netnet/cockpit/src/app`
- Ensure the project is being run from the correct folder: `netnet/cockpit`
- If you previously used a symlink `app -> src/app`, remove it and restart (prefer canonical `src/app`).

### 2) /api/proof-paid returns 500
- This typically indicates x402 middleware/runtime mismatch. In dev, it should return 402 unless bypass enabled.

### 3) Peer-deps install errors
- Use `npm install --legacy-peer-deps` at repo root (root postinstall installs cockpit deps too).

## Operator Console
Visit: `/ops`
It provides one-click links to core pages and JSON endpoints used during demos/debugging.
