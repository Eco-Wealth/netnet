---
title: Netnet Cockpit
description: Operate netnet-cockpit via its agent API to estimate/quote/retire carbon credits and generate verifiable proof artifacts.
--

# Netnet Cockpit (OpenClaw Skill)

## Quick Start

1) Confirm server is reachable:

```bash
curl -s $NETNET_BASE_URL/api/health | jq
```

2) Get agent surface info:

```bash
curl -s "$NETNET_BASE_URL/api/agent/carbon?action=info" | jq
```

## Core Workflow (Carbon Retirement)

### 0) Guardrails (non-negotiable)

- Never move funds unless the operator explicitly instructs you to.
- For any “retire” initiation, require:
  - `beneficiaryName` (who gets credit)
  - `reason` (why this retirement is being done)
- Always return **payment instructions** rather than attempting to pay.

### 1) Discover projects

```bash
curl -s "$NETNET_BASE_URL/api/agent/carbon?action=projects" | jq
```

### 2) Get a quote

Required query parameters:
- `projectId`
- `amount` (credits)
- optional: `chain` (default base), `token` (default USDC)

```bash
curl -s "$NETNET_BASE_URL/api/agent/carbon?action=quote&projectId=PROJECT_ID&amount=1&chain=base&token=USDC" | jq
```

Expected output shape (high level):
- `ok: true`
- `quote: { totalCost, ... }`
- `nextAction: "pay" | "none"`

### 3) Initiate retirement (does NOT pay)

```bash
curl -s -X POST "$NETNET_BASE_URL/api/agent/carbon" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "amount": 1,
    "chain": "base",
    "token": "USDC",
    "beneficiaryName": "EcoWealth Corporation",
    "reason": "Product test: demonstrate verifiable retirement proof object"
  }' | jq
```

Expected output:
- `payment: { chain, token, amount, recipient, memo? }`
- `tx: { status, ... }`
- `nextAction: "pay"`

### 4) Track status (after operator pays and provides txHash)

```bash
curl -s "$NETNET_BASE_URL/api/agent/carbon?action=status&txHash=0x..." | jq
```

Expected output:
- lifecycle status
- `certificateId` when available
- `nextAction: "wait" | "verify" | "proof"`

## Proof Generation

Build a proof object (deterministic for the same inputs):

```bash
curl -s -X POST "$NETNET_BASE_URL/api/proof/build" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "bridge_retirement",
    "txHash": "0x...",
    "certificateId": "CERT_ID",
    "url": "https://bridge.eco/..."
  }' | jq
```

Outputs:
- `proof` JSON object with schema `netnet.proof.v1`
- `post` helpers for short/long share text (if enabled in UI)
- `verifyUrl` for public verification page and API.

Verify a proof:

```bash
curl -s "$NETNET_BASE_URL/api/proof/verify/<proofId>" | jq
```

## Paywall semantics (x402)

- `/api/proof-paid` is paywalled (returns 402) unless:
  - payment is satisfied OR
  - dev bypass is enabled: `X402_DEV_BYPASS=true`

Check:

```bash
curl -i "$NETNET_BASE_URL/api/proof-paid"
```

## Environment

Required:
- `NETNET_BASE_URL`

Optional:
- `X402_PAY_TO` (address / pay-to identifier)
- `X402_DEV_BYPASS` (`true` for local dev only)
- Bridge variables (see app README)
