# netnet Skill Registry (Canonical)

This file is the source-of-truth index for skill coverage in `skills/`.
Scope target: `netnet/cockpit/src/app/api/**`.

## Status legend
- `ACTIVE` = current supported skill contract
- `SUPERSEDED` = retained for compatibility/history; do not extend

## Registry
| Skill file | Status | Primary API coverage |
|---|---|---|
| `netnet-cockpit.md` | ACTIVE | `/api/health`, `/api/agent/carbon`, `/api/proof/build`, `/api/proof-paid` |
| `netnet-cockpit-carbon.md` | ACTIVE | `/api/agent/carbon` |
| `netnet-cockpit-trade.md` | ACTIVE | `/api/agent/trade` |
| `netnet-cockpit-trade-stub.md` | SUPERSEDED | `/api/agent/trade` |
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
| `netnet-cockpit-programs.md` | ACTIVE | `/api/programs` |
| `netnet-cockpit-security.md` | ACTIVE | `/api/security/audit` |

## Maintenance rules
1. Any new API route in `netnet/cockpit/src/app/api/**` must be mapped here in the same change.
2. Any skill contract change must update both:
   - the skill markdown file in `skills/`
   - the API contract source-of-truth file in `netnet/cockpit/docs/`
3. Do not delete superseded skills without migration notes in this registry.
