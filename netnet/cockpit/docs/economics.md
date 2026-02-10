# Incentives + Fee Routing Rules (netnet.econ.v1)

This layer provides a **single, deterministic incentives packet** that every action can attach to its response.

It is **planning metadata**: it does not move funds by itself. Execution still remains operator-approved.

## Env config (BPS)
All splits are in basis points (BPS) out of 10,000:

- `NETNET_OPERATOR_BPS` (default 5000)
- `NETNET_INFERENCE_BPS` (default 2000)
- `NETNET_MICRORETIRE_BPS` (default 1000)
- Treasury = 10,000 - (operator + inference + microRetire)

## Output shape
`computeIncentivesPacket(...)` returns:

- `version: "netnet.econ.v1"`
- `action`: string identifier
- `basis`: `{ token, chain, amountToken, estimatedUsd? }`
- `config`: bps config
- `allocations`: per-bucket bps + optional USD amounts
- `notes`: guidance / caveats

If `estimatedUsd` is missing, USD amounts are omitted (BPS-only).
