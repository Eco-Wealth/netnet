# OpenClaw Intent Map

This map keeps agent prompts deterministic by binding user intents to known Operator actions.

## Intent to action

| Intent | Proposal action | Route | Notes |
| --- | --- | --- | --- |
| Read wallet balances | `bankr.wallet.read` | `/api/bankr/wallet` | Read-only. |
| Read token metadata | `bankr.token.info` | `/api/bankr/token/info` | Read-only. |
| Plan token operation | `bankr.token.actions` | `/api/bankr/token/actions` | Propose-first. |
| Plan launch workflow | `bankr.launch` | `/api/bankr/launch` | High-risk, guarded. |
| Draft Zora content post | `zora.post.content` | `/api/agent/zora` | Propose-first. |
| Draft Kumbaya content post | `kumbaya.post.content` | `/api/agent/kumbaya` | Propose-first. |
| Draft execution plan | `bankr.plan` | `/api/bankr/token/actions` | Proposal-only plan shape. |
| Simulate Bankr proposal | `bankr.simulate` | `internal/simulator` | No funds touched. |

## Guardrails

- All Bankr actions start as proposals.
- Execution requires approved proposal + locked intent + generated plan.
- `bankr.launch` is treated as write-class and must include explicit write confirmation.
