---
title: Netnet Trade Connector (Stub)
description: Safe-by-default trade connector scaffold. DRY_RUN only unless explicitly enabled with caps.
--

# Netnet Trade Connector (Stub)

## Default behavior

- `TRADE_ENABLED=false` (default)
- `POST /api/agent/trade` runs **DRY_RUN** and returns an executionPlan (no broadcast).

## Endpoints

- `GET /api/agent/trade?action=info`
- `GET /api/agent/trade?action=quote` (simulated quote)
- `POST /api/agent/trade` (dry-run executionPlan by default)

## Safety caps (future)

- `TRADE_MAX_USD=25`
- `TRADE_ALLOWLIST_TOKENS=USDC,ETH`
