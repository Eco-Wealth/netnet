# netnet cockpit — Bankr Launch (Propose-only)

Endpoint: `POST /api/bankr/launch`

## Contract (stable)
Input:
```json
{
  "name": "EcoWealth",
  "symbol": "ECO",
  "chain": "base",
  "description": "optional",
  "website": "optional",
  "twitter": "optional",
  "imageUrl": "optional",
  "submit": false
}
```

Output (propose-only):
- `requiresApproval: true`
- `whatWillHappen[]`
- `estimatedCosts.usd` + `estimatedCosts.notes[]`
- `proposal` (echo)
- `proof` (netnet.proof.v1)

Notes:
- Setting `"submit": true` attempts to forward to Bankr if `BANKR_API_BASE_URL` is configured.
- Default mode is PROPOSE_ONLY; do not assume funds movement.
