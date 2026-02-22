# Kumbaya Connector

Connector surface for Operator proposal-first posting workflows.

## Route

- `GET|POST /api/agent/kumbaya`

## Canonical action

- `kumbaya.post.content`

## Semantics

- `GET`: returns connector contract + safety posture.
- `POST` with `execute=false` (default): returns deterministic proposal plan + proof envelope.
- `POST` with `execute=true`: attempts Privy wallet transaction send for configured wallet lane.

## Safety

- Proposal-first by default.
- Execution remains gated by operator approval, intent lock, and executor boundary checks.
- Requires wallet lane mapping for write paths.
