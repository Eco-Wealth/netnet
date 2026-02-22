# Unit 48 — Allocation planner (revenue routing)

Adds:
- `/api/agent/allocate` (GET info, POST plan)
- `src/lib/economics/allocation.ts` deterministic allocation computation w/ normalization + floors
- `/economics` page (simple UI surface)
- `skills/netnet-cockpit-economics.md`

Non-goals:
- No automatic transfers, no onchain execution.
- Downstream execution (operator-approved) handled by existing policy/approval units.
