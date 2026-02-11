# Trading API (proposal-only)

Route: `/api/agent/trade`

Status: **PROPOSE_ONLY**. This route never signs or broadcasts transactions.

## Supported actions

### `GET ?action=info`

Returns mode, supported actions, and default policy envelope.

Example:
`GET /api/agent/trade?action=info`

### `GET ?action=quote`

Returns an estimated quote if policy gates pass.

Required query fields:
- `chain`
- `venue`
- `from`
- `to`
- `amountUsd`

Example:
`GET /api/agent/trade?action=quote&chain=base&venue=bankr&from=USDC&to=REGEN&amountUsd=50`

### `GET ?action=plan`

Explicitly defined as not allowed on GET.

Response:
- HTTP `405`
- error code `METHOD_NOT_ALLOWED`
- guidance to use `POST /api/agent/trade` with `action: "plan"`

### `POST` with `action: "plan"`

Builds a proposal packet and proof envelope.

Minimal request body:
```json
{
  "action": "plan",
  "chain": "base",
  "venue": "bankr",
  "from": "USDC",
  "to": "REGEN",
  "amountUsd": 50,
  "operator": {
    "id": "operator-1",
    "reason": "rebalance"
  }
}
```

Response includes:
- `ok: true`
- `mode: "PROPOSE_ONLY"`
- `plan.whatWillHappen[]`
- `plan.requiresApproval: true`
- `plan.estimatedCosts`
- `proof` (`kind: "netnet.trade.plan.v2"`)

## Guardrails and failure cases

- Policy allowlists/caps are enforced server-side.
- Blocked requests return `403` with details and policy context.
- Invalid payloads return `400` with validation details.
