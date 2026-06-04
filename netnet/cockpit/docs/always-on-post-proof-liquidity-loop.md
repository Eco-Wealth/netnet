# Always-On Post / Proof / Liquidity Loop

Status: design packet for operator review. No live trading, posting, retirement, or capital movement is authorized by this document.

## Operator intent

Every scheduled marketing post should become a small, receipt-backed ecological wealth event.

The ideal loop is:

1. A scheduled post is prepared for YouTube first, then other social lanes.
2. The post is tied to a proposal packet describing the intended ecological action.
3. The VPS/operator wallet prepares bounded transactions: swap, route, retirement, or provision action.
4. Execution remains approval-gated unless a later policy explicitly enables limited automation.
5. The final output is a business-readable receipt: post link, wallet action, proof object, retirement/provision status, and liquidity-web impact.

## Current liquidity web thesis

The current architecture uses separate roles instead of treating every pool as the same thing:

- `LITCREDIT` is fuel: minted credit that can be routed into useful actions.
- `ECO` is the hub: the asset routing pressure should touch.
- `HYPE` is the movement engine: the volatile external asset paired with ECO to create movement and arbitrage pressure.
- `LITCOIN` is the backing asset: collateral base supporting the LITCREDIT loop.

Near-term LP/provisioning design:

- Create/maintain `LITCOIN/LITCREDIT` for the credit/backing lane.
- Create/maintain `ECO/HYPE` for the volatility/movement lane.
- Use existing `LITCREDIT -> ECO` routing as the usage lane rather than over-fragmenting new LPs.

Self-sustaining volume is not assumed. The first phase is an operator-subsidized boot loop. It becomes self-sustaining only if fees, appreciation, and future service revenue exceed gas, slippage, credit cost, and subsidy cost.

## Scheduled post transaction bundle

Each post should be able to carry a bundle like:

```json
{
  "post": {
    "channel": "youtube",
    "status": "scheduled|posted",
    "url": "",
    "topic": "",
    "campaignId": ""
  },
  "wallet": {
    "profileId": "ecowealth-zora",
    "executor": "vps-wallet",
    "mode": "PROPOSE_ONLY|EXECUTE_WITH_LIMITS"
  },
  "liquidityActions": [
    {
      "kind": "swap|lp_provision|fee_route",
      "route": "LITCREDIT->ECO|ECO/HYPE|LITCOIN/LITCREDIT",
      "maxUsd": 20,
      "expectedProof": "txHash + route quote + receipt"
    }
  ],
  "ecologicalAction": {
    "kind": "retirement|provision_record|proof_only",
    "beneficiaryName": "EcoWealth",
    "reason": "post-linked ecological wealth provision",
    "status": "quoted|payment_instructions|submitted|retired|proof_only"
  },
  "receipt": {
    "proofObjectId": "",
    "txHash": "",
    "verificationUrl": "",
    "operatorNotes": ""
  }
}
```

## Repo comparison

Existing repo pieces already cover most of this intent:

- Social posting templates already model YouTube-first draft/proposal posting.
- The Zora connector is proposal-first and approval-gated.
- The EcoWealth wallet profile already exists for the Zora operations lane.
- Carbon retirement APIs already support estimate, project lookup, quote, initiate, and status flows.
- Strategy presets already include micro-retirement and dry-run trade planning.
- Liquidity pledge metadata exists, but it is intentionally not an automatic on-chain execution path.

The missing product surface is the orchestration layer that binds one scheduled post to one transaction/provision bundle and one readable receipt.

## Proposed unit: post-linked ecological provisioning packet

Build a proposal-only orchestration surface that creates a `PostProofLiquidityPacket` from a scheduled post.

Required fields:

- `campaignId`
- `postChannel`
- `postSchedule`
- `postUrl` when available
- `walletProfileId`
- `liquidityRoute`
- `maxUsdPerAction`
- `ecologicalActionKind`
- `beneficiaryName`
- `reason`
- `proofObjectId`
- `status`

Allowed first implementation:

- Draft/proposal only.
- No automatic live posting.
- No automatic live trading.
- No automatic retirement payment.
- May generate transaction plans, quotes, payment instructions, and proof envelopes.
- May attach tx hashes/status after the operator executes manually or through an approved wallet lane.

## Product story

EcoWealth is building an always-on ecological provisioning loop where media, compute, credit, liquidity, and proof move through the same public receipt network.

A post is not just marketing. It is a trigger for a small accountable provision action:

Post -> proposal -> wallet route -> ecological proof -> public receipt.

## Safety boundaries

- EOA controls LP design and capital allocation.
- VPS/operator wallet may plan and later execute only under explicit policy limits.
- Do not present proposal-only actions as completed outcomes.
- Do not claim retirement, provisioning, liquidity, or fee results without tx/status/proof.
- Do not create fake volume or circular wash activity.
- Keep all live execution behind operator approval until policy and receipts are fully implemented.
