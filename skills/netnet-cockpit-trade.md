# netnet cockpit — Trade (Unit N, propose-only)

Endpoint: `GET/POST /api/agent/trade`

## Safety mode
- Default **PROPOSE_ONLY**
- No signing or broadcasting from this endpoint
- All responses must include:
  - **what will happen**
  - **estimated costs**
  - **requires approval**
  - **proof-of-action** object

---

## GET action=info

Request:
`GET /api/agent/trade?action=info`

Response (example):
```json
{
  "ok": true,
  "mode": "PROPOSE_ONLY",
  "trade": {
    "actions": ["quote", "plan"],
    "defaultChain": "base",
    "defaultVenue": "bankr",
    "policy": {
      "autonomyLevel": "PROPOSE_ONLY",
      "allowlists": { "venues": [], "chains": [], "tokens": [] },
      "caps": { "maxUsdPerTrade": 250, "maxUsdPerDay": 500 }
    }
  }
}
```

---

## GET action=quote

Request:
`GET /api/agent/trade?action=quote&chain=base&venue=bankr&from=USDC&to=REGEN&amountUsd=50`

Response (example):
```json
{
  "ok": true,
  "quote": {
    "chain": "base",
    "venue": "bankr",
    "from": "USDC",
    "to": "REGEN",
    "amountUsd": 50,
    "feeBps": 120,
    "estimatedFeeUsd": 0.6,
    "slippageBpsSuggested": 50,
    "note": "Quote is an estimate; final execution handled by Bankr/OpenClaw with operator approval."
  }
}
```

---

## POST action=plan

Request:
`POST /api/agent/trade`
```json
{
  "action": "plan",
  "chain": "base",
  "venue": "bankr",
  "from": "USDC",
  "to": "REGEN",
  "amountUsd": 50,
  "operator": { "id": "operator-1", "reason": "rebalance" }
}
```

Response includes plan + proof:
```json
{
  "ok": true,
  "mode": "PROPOSE_ONLY",
  "plan": {
    "whatWillHappen": ["..."],
    "requiresApproval": true,
    "estimatedCosts": { "inferenceUsd": 0.01, "onchainGasUsd": "unknown", "venueFeesUsd": "estimated at quote time" },
    "operatorIntent": { "id": "operator-1", "reason": "rebalance" }
  },
  "proof": { "kind": "netnet.trade.plan.v2", "claims": { "plan": {}, "policy": {} } }
}
```
