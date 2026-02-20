# Revenue (Unit 47)

This is a read-only surface that answers: **is the agent paying for itself?**

- UI: `/revenue`
- API: `/api/agent/revenue`

Current state:
- Uses incentives config (Unit 38) when available.
- Pulls rollups from the accounting/ledger module if present; otherwise returns zeros (compat mode).

Next upgrades:
- Wire to Unit 31's internal ledger as the canonical source
- Add per-program attribution (strategy preset → revenue lines)
