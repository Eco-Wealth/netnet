# netnet-cockpit (v0.2 — ecoToken + Bridge.eco)

Mobile-first cockpit UI + API routes for a future **Netnet** autonomous operator.

## What is this?

A tool for operators—including autonomous agents—who want to acquire, purchase, and/or retire eco-credits through the [Bridge.eco](https://bridge.eco) web interface.

The eco-credits available through Bridge.eco are **web3-native credits** with full documentation available on [Regen Ledger](https://docs.regen.network/) and the [Regen Network app](https://app.regen.network).

### Key Concepts

- **Eco-credits**: Tokenized environmental assets representing verified ecological outcomes (carbon sequestration, biodiversity, etc.)
- **Retirement**: Permanently claiming the environmental benefit of a credit (removing it from circulation)
- **Bridge.eco**: A web interface for purchasing and retiring eco-credits using crypto payments
- **ecoToken**: Verification system for confirming retirement transactions

## Features
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
- ecoToken's public verification dashboard is `https://scan.ecotoken.earth/` (this app links you there with the tx hash).

## Resources

- [Regen Network](https://regen.network) — The ecological data and credits infrastructure
- [Regen Registry](https://app.regen.network) — Browse eco-credit projects and classes
- [Regen Ledger Docs](https://docs.regen.network) — Technical documentation for the blockchain
- [Bridge.eco](https://bridge.eco) — Web interface for purchasing and retiring credits
- [ecoToken Scanner](https://scan.ecotoken.earth) — Verify retirement transactions
- [x402 Protocol](https://x402.org) — Payment protocol used for API access control
