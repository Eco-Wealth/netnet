# netnet-cockpit (v0.2 — ecoToken + Bridge.eco)

Mobile-first cockpit UI + API routes for a future **Netnet** autonomous operator.

What’s included:
- **Proof / Execute / Retire** tabs (mobile bottom-nav + desktop top-nav)
- **x402 paywall** protecting `GET /api/proof-paid` (Next.js middleware)
- **Bridge.eco retirement API wiring**:
  - `GET /api/bridge/registry` -> projects + supported tokens
  - `GET /api/bridge/tx?hash=...` -> transaction lifecycle + `certificate_id`
  - deep-link generator for `https://bridge.eco/?tab=impact&...`
- **ecoToken verification hooks**:
  - UI “Verify on scan.ecotoken.earth” link + copyable tx hash
  - `GET /api/ecotoken/scan?hash=...` returns scan URL + instructions

## Setup

### 1) Install
```bash
cd cockpit
npm install
```

### 2) Configure env
Copy `.env.example` to `.env.local` and set `X402_PAY_TO`.

```bash
cp .env.example .env.local
```

### 3) Run
```bash
npm run dev
```

Open:
- http://localhost:3000/proof
- http://localhost:3000/retire

## Acceptance tests

### A) x402 paywall is active
```bash
curl -i http://localhost:3000/api/proof-paid
```
Expected: HTTP **402** with an x402 challenge (`WWW-Authenticate`).

### B) Bridge.eco API wiring works
```bash
curl -s http://localhost:3000/api/bridge/registry | head
```
Expected: JSON with `projects` and `supportedTokens`.

```bash
curl -i "http://localhost:3000/api/bridge/tx?hash=0x123"
```
Expected: 400 with helpful error (invalid hash). Paste a real hash from a Bridge.eco impact payment to see status.

### C) ecoToken scan helper works
```bash
curl -s "http://localhost:3000/api/ecotoken/scan?hash=0x123" | jq
```
Expected: JSON with `scanUrl` and instructions.

## Notes
- Retirement execution is **outside** this app: a wallet sends payment to the project wallet address, then you track status until `RETIRED` and display `certificate_id`.
- ecoToken’s public verification dashboard is `https://scan.ecotoken.earth/` (this app links you there with the tx hash).
