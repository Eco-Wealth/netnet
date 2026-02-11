# ecoToken Scan Helper

## What it does
- Provides:
  - `GET /api/ecotoken/scan?hash=0x...`
  - `GET /api/ecotoken/scan?chain=base&address=0x...`
- Returns:
  - `kind` (`tx` or `asset`)
  - `url` (scan.ecotoken.earth deep link)
  - `input` echo for audit traceability
  - instructions for verification UX

## What it proves (and does NOT prove)
- Shows third-party context about a tx (supporting evidence).
- Does **not** guarantee the retirement is complete/correct.
- Use alongside Bridge certificate IDs and official registry proofs.

## Curl
```bash
curl -s "http://localhost:3000/api/ecotoken/scan?hash=0x0000000000000000000000000000000000000000000000000000000000000000" | jq .
curl -s "http://localhost:3000/api/ecotoken/scan?chain=base&address=0x0000000000000000000000000000000000000000" | jq .
```
