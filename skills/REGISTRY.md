# netnet Skill Registry (Canonical)

This file is the source-of-truth index for skill coverage in `skills/`.
Scope target: `netnet/cockpit/src/app/api/**`.

Exact API request/response contracts are canonical in:
- `netnet/cockpit/docs/api-contract-source-of-truth.json`
- `netnet/cockpit/docs/CONTRACT_AUTHORITY.md`

## Status legend
- `ACTIVE` = current supported skill contract

## Registry
| Skill file | Status | Primary API coverage |
|---|---|---|
| `netnet-cockpit.md` | ACTIVE | `/api/health`, `/api/agent/carbon`, `/api/proof/build`, `/api/proof-paid` |
| `netnet-cockpit-carbon.md` | ACTIVE | `/api/agent/carbon` |
| `netnet-cockpit-trade.md` | ACTIVE | `/api/agent/trade` |
| `netnet-cockpit-regen.md` | ACTIVE | `/api/agent/regen` |
| `netnet-cockpit-regen-projects.md` | ACTIVE | `/api/agent/regen/projects` |
| `netnet-cockpit-regen-projects-workspace.md` | ACTIVE | `/api/agent/regen/projects`, `/api/work` |
| `netnet-cockpit-revenue.md` | ACTIVE | `/api/agent/revenue` |
| `netnet-cockpit-economics.md` | ACTIVE | `/api/agent/allocate` |
| `netnet-cockpit-economics-loop.md` | ACTIVE | `/api/agent/revenue`, `/api/agent/allocate`, `/api/work` |
| `netnet-economics.md` | ACTIVE | `/api/econ/capitals`, `/api/econ/delta` |
| `netnet-cockpit-ecotoken-scan.md` | ACTIVE | `/api/ecotoken/scan` |
| `netnet-cockpit-megaeth.md` | ACTIVE | `/api/agent/megaeth` |
| `netnet-cockpit-bankr-wallet.md` | ACTIVE | `/api/bankr/wallet` |
| `netnet-cockpit-bankr-token.md` | ACTIVE | `/api/bankr/token/info`, `/api/bankr/token/actions` |
| `netnet-cockpit-bankr-launch.md` | ACTIVE | `/api/bankr/launch` |
| `netnet-cockpit-bankr-agent.md` | ACTIVE | `/api/bankr/launch`, `/api/bankr/token/actions`, `/api/bankr/token/info`, `/api/bankr/wallet` |
| `netnet-cockpit-programs.md` | ACTIVE | `/api/programs` |
| `netnet-cockpit-security.md` | ACTIVE | `/api/security/audit` |

## Operator Skill Context
| id | route | description | ownership |
|---|---|---|---|
| bankr.agent | /api/bankr/* | Bankr agent planning + proposal generation for DCA/LP/rebalance/market-making workflows. | platform |
| bankr.wallet.read | /api/bankr/wallet | Read wallet summary + balances (read-only). | platform |
| bankr.token.info | /api/bankr/token/info | Read token metadata/info (read-only). | platform |
| bankr.token.actions | /api/bankr/token/actions | Propose token actions via Bankr (propose/execute gated). | platform |
| bankr.launch | /api/bankr/launch | Propose launch flow via Bankr (propose/execute gated). | platform |

## Maintenance rules
1. Any new API route in `netnet/cockpit/src/app/api/**` must be mapped here in the same change.
2. Any skill contract change must update both:
   - the skill markdown file in `skills/`
   - the API contract source-of-truth file in `netnet/cockpit/docs/`
3. Validate integrity with:
   - `npm run contracts:check`
