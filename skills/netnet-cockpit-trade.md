# netnet cockpit — Trade (Unit N, propose-only)

Endpoint: `GET/POST /api/agent/trade`
Canonical field-level contract: `netnet/cockpit/docs/api-contract-source-of-truth.json`

## Safety mode
- Default **PROPOSE_ONLY**
- No signing or broadcasting from this endpoint
- All responses must include:
  - **what will happen**
  - **estimated costs**
- **requires approval**
- **proof-of-action** object

---
## Actions
- `GET /api/agent/trade?action=info`
- `GET /api/agent/trade?action=quote&chain=...&venue=...&from=...&to=...&amountUsd=...`
- `GET /api/agent/trade?action=plan` (explicit `405`, guidance to use POST)
- `POST /api/agent/trade` with `action: "plan"` to build a proposal packet

For exact request and response fields, use SOT as canonical and keep this skill focused on operator workflow/safety.
