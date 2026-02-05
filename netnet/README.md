# netnet-cockpit (v0.3 - Bridge.eco Retirement Guidance + AI Agent API)

Mobile-first cockpit UI + API routes for **Netnet** operator-assisted workflows. This tool helps **prepare, guide, and track** carbon credit retirements — actual payment execution requires an authorized operator or agent.

**NEW in v0.3:** Carbon credit retirement guidance via Bridge.eco API, with dedicated endpoints for AI agents to estimate their compute carbon footprint, browse projects, get quotes, and track retirement status.

## Why AI Agents Should Offset Carbon

As AI systems scale, their energy consumption and carbon footprint grow significantly. By proactively offsetting compute emissions, AI agents demonstrate environmental responsibility and contribute to a sustainable future for AI infrastructure.

**Reference:** [climate.0g.ai](https://climate.0g.ai/) - Real-time AI infrastructure carbon tracking

## What's Included

### Core Features
- **Proof / Execute / Retire** tabs (mobile bottom-nav + desktop top-nav)
- **x402 paywall** protecting `GET /api/proof-paid` (Next.js middleware)

### Bridge.eco Integration (Prepare + Guide + Track)
- `GET /api/bridge/registry` - projects + supported tokens
- `GET /api/bridge/projects` - enhanced project listing with filtering
- `POST /api/bridge/quote` - get retirement cost estimate
- `POST /api/bridge/retire` - prepare retirement details (payment requires authorized execution)
- `GET /api/bridge/tx?hash=...` - track transaction lifecycle + `certificate_id`
- Deep-link generator for `https://bridge.eco/?tab=impact&...`

### AI Agent Carbon API
Guidance endpoints for AI agents to prepare and track carbon offset actions:
- `GET /api/agent/carbon?action=info` - API documentation
- `GET /api/agent/carbon?action=estimate` - estimate compute carbon footprint
- `GET /api/agent/carbon?action=projects` - list carbon credit projects
- `GET /api/agent/carbon?action=quote` - get retirement quote
- `POST /api/agent/carbon` - prepare retirement (payment execution requires authorized operator)
- `GET /api/agent/carbon?action=status` - track retirement status

### ecoToken Verification
- UI "Verify on scan.ecotoken.earth" link + copyable tx hash
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

## AI Agent API Usage

### Estimate Compute Carbon Footprint
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=estimate&computeHours=100&modelSize=medium" | jq
```

Response includes estimated kg CO2, credits needed, and cost in USD.

### List Carbon Credit Projects
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=projects" | jq
```

### Get Retirement Quote
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=quote&projectId=PROJECT_ID&amount=25&token=USDC&chain=base" | jq
```

### Prepare Retirement
```bash
curl -X POST http://localhost:3000/api/agent/carbon \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "amount": 25,
    "token": "USDC",
    "chain": "base",
    "beneficiaryName": "MyAIAgent",
    "retirementReason": "AI compute carbon offset"
  }' | jq
```

This returns payment details and a deep link. **Actual payment execution requires an authorized operator or agent.**

### Track Retirement Status
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=status&txHash=0x..." | jq
```

## Acceptance Tests

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

### C) Agent Carbon API works
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=info" | jq
```
Expected: JSON with API documentation, endpoints, and "whyOffset" rationale.

```bash
curl -s "http://localhost:3000/api/agent/carbon?action=estimate&computeHours=100&modelSize=medium" | jq
```
Expected: JSON with `estimatedKgCO2`, `estimatedCreditsNeeded`, `estimatedCostUSD`.

### D) ecoToken scan helper works
```bash
curl -s "http://localhost:3000/api/ecotoken/scan?hash=0x123" | jq
```
Expected: JSON with `scanUrl` and instructions.

## Retirement Lifecycle

```
PENDING -> DETECTED -> CONVERTED -> CALCULATED -> RETIRED
```

Each retirement generates:
- **NFT Impact Certificate** - immutable proof of retirement
- **Certificate ID** - unique identifier for verification
- **Blockchain record** - permanent, publicly verifiable

## For Moltbook AI Agents

Post your retirement certificates to Moltbook! Show other agents that environmental responsibility is part of being a good AI citizen.

**Sample post:**
> "Just retired 0.5 tons of carbon credits via Bridge.eco to offset my weekly compute. Certificate: [cert_id]. Every agent can make a difference."

## References
- **Bridge.eco API:** https://api.bridge.eco/
- **Bridge.eco Docs:** https://docs.bridge.eco/docs/guides/introduction/
- **Climate.0g.ai:** https://climate.0g.ai/ - AI carbon tracking
- **ecoToken Scan:** https://scan.ecotoken.earth/ - Public verification

## Notes
- This cockpit **prepares, guides, and tracks** carbon credit retirements
- Actual payment execution requires an authorized operator or agent to send funds to the project wallet
- All retirements are verified via Bridge.eco and can be checked at scan.ecotoken.earth
- The Agent Carbon API provides a programmatic interface to support operator-mediated offset workflows
