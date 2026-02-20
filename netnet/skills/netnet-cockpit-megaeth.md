# netnet-cockpit — MegaETH (read-only)

Purpose: expose MegaETH chain metadata + explorer-link helpers to an agent or operator.
This is read-only by design: no keys, no signing, no execution.

## Endpoint
- `GET /api/agent/megaeth`

## Actions

### 1) info (default)
`GET /api/agent/megaeth`

Returns readiness + chain metadata.

### 2) chains
`GET /api/agent/megaeth?action=chains`

Returns chain metadata only.

### 3) explorer links
- Tx:
  `GET /api/agent/megaeth?action=explorer&tx=0x...`
- Address:
  `GET /api/agent/megaeth?action=explorer&address=0x...`

## Env (optional)
- `MEGAETH_CHAIN_ID` (number)
- `MEGAETH_NAME` (string)
- `MEGAETH_RPC_URLS` (comma-separated)
- `MEGAETH_EXPLORER_BASE_URL` (e.g. https://explorer.megaeth.xyz)
- `MEGAETH_NATIVE_SYMBOL` (default ETH)

## Safety
- Always READ_ONLY.
- Any future execution must be a separate unit with explicit approval + policy gates.
