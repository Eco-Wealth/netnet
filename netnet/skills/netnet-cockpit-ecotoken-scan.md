# netnet cockpit — EcoToken scan skill (read-only)

## Goal
Generate an EcoToken Scan link for an address (preferred) or a transaction hash.

## API

### Address/asset scan (preferred)
**Request**
`GET /api/ecotoken/scan?chain=<chain>&address=<0x_address>`

**Response**
```json
{
  "ok": true,
  "kind": "asset",
  "url": "https://scan.ecotoken.earth/base/0x...",
  "instructions": "Open the scan link...",
  "input": { "chain": "base", "address": "0x..." }
}
```

### Transaction scan
**Request**
`GET /api/ecotoken/scan?hash=<0x_txhash>`

**Response**
```json
{
  "ok": true,
  "kind": "tx",
  "url": "https://scan.ecotoken.earth/tx/0x...",
  "instructions": "Open the scan link...",
  "input": { "hash": "0x..." }
}
```

## Safety class
READ_ONLY — never signs or submits transactions.
