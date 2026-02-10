# EcoToken Scan contract

This cockpit exposes a single scan helper endpoint used by humans and agents.

## Endpoint

`GET /api/ecotoken/scan`

### Option A — Address/asset scan (recommended for Asset Workspace)

Query:
- `chain` (e.g. `base`)
- `address` (0x…40 hex)

Example:
- `/api/ecotoken/scan?chain=base&address=0x0000000000000000000000000000000000000000`

Response:
- `{ ok: true, kind: "asset", url, instructions, input }`

### Option B — Transaction scan

Query:
- `hash` (0x…64 hex)

Example:
- `/api/ecotoken/scan?hash=0x0000000000000000000000000000000000000000000000000000000000000000`

Response:
- `{ ok: true, kind: "tx", url, instructions, input }`

## Notes

- The endpoint is read-only and safe-by-default.
- Downstream flows should attach the returned `url` to a proof object and/or work item.
