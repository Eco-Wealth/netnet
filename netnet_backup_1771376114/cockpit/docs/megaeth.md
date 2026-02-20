# MegaETH (Unit 54)

This unit adds a read-only MegaETH surface:
- chain metadata (id/name/rpcUrls/explorer)
- explorer link helpers

No signing, no keys, no transaction execution.

## Quick checks
- `curl -s "http://localhost:3000/api/agent/megaeth" | jq`
- `curl -s "http://localhost:3000/api/agent/megaeth?action=chains" | jq`
- `curl -s "http://localhost:3000/api/agent/megaeth?action=explorer&tx=0xdeadbeef" | jq`

## Notes
If MegaETH chain parameters change, update env vars first (preferred), otherwise update `src/lib/megaeth.ts`.
