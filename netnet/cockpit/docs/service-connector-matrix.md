# Service Connector Matrix

Canonical map of external/internal connectors used by Operator workflows.

| Connector | Type | Surface | Capability | Owner | Execution mode |
| --- | --- | --- | --- | --- | --- |
| Bankr Wallet | Internal route | `/api/bankr/wallet` | Wallet snapshot read | platform | Read |
| Bankr Token Info | Internal route | `/api/bankr/token/info` | Token metadata read | platform | Read |
| Bankr Token Actions | Internal route | `/api/bankr/token/actions` | Action planning/execution envelope | platform | Propose/Execute gated |
| Bankr Launch | Internal route | `/api/bankr/launch` | Launch planning/execution envelope | platform | Propose/Execute gated |
| Zora Connector | Internal route | `/api/agent/zora` | Proposal-first content posting connector | platform | Propose/Execute gated |
| Kumbaya Connector | Internal route | `/api/agent/kumbaya` | Proposal-first content posting connector | platform | Propose/Execute gated |
| Telegram Bridge | External API | `telegram sendMessage` + `/api/telegram/webhook` | Read/Propose chat ingress | platform | No execute |
| Bridge Quote | Internal route | `/api/bridge/quote` | Quote generation | platform | Read |
| Bridge Retire | Internal route | `/api/bridge/retire` | Retirement execution | platform | Execute gated |
| Proof Feed | Internal route | `/api/proof/feed` | Proof/audit readout | platform | Read |

## Notes

- Operator calls these through explicit allowlists only.
- No dynamic route inference.
- Policy check is required at execution boundary.
