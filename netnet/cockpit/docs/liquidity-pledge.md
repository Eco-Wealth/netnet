# Liquidity Pledge Incentive Lane

This document tracks how netnet uses the EcoWealth liquidity pledge mechanism as an agent incentive signal.

## Source baseline

The current reference bundle is `liquidity-pledge-main.zip` and companion unit zips provided externally.

Key constants from the v0 spec:

- Chain: Base (`8453`)
- ECO token: `0x170dc0ca26f1247ced627d8abcafa90ecf1e1519`
- Mechanism: `ecowealth-pledge-v0`

## In-platform usage (current)

In `/ops/control`, Vealth work orders can include:

- `liquidityPledge.enabled`
- `liquidityPledge.partnerToken`
- `liquidityPledge.ecoMatchedCapWei`

These fields are stored in the work-order contract patch event for auditability and downstream dispatch.

## Safety boundaries

- Liquidity pledge metadata is incentive/config only in this lane.
- No automatic on-chain pledge execution is performed from this metadata.
- Any future pledge execution must remain proposal-first and policy-gated.

## Next integration steps

1. Add a dedicated pledge proposal template in Operator.
2. Map pledge actions to explicit allowlisted execution routes.
3. Attach payout + pledge outcomes to proof artifacts.
