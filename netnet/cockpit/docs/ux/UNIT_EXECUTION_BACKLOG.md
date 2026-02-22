# Unit Execution Backlog

This backlog tracks machine-first Operator execution units.

## Completed

### Unit 072 — OpenClaw UX simplification

- Kept one primary typing lane in Operator seat.
- Moved advanced draft/template tooling behind a toggle.

### Unit 073 — Baseline build repair

- Fixed MCP adapter/type import/export consistency.
- Normalized `MarketSnapshot.base.latestBlock` usage.

### Unit 074 — Fast health lane

- Added deterministic health scripts (`health:fast`) for build + typecheck + drift checks.

### Unit 075 — Contract ownership lane

- Drift checks now auto-detect the active cockpit root before validating contracts/policy/route guards.

### Unit 076 — Service connector matrix

- Added canonical connector matrix doc for Bankr, Bridge, Telegram, and Proof surfaces.

### Unit 077 — Execution guardrail checks

- Route-policy checker validates Bankr/bridge guard markers on the active cockpit tree.

### Unit 078 — Operator dense 3-section board

- Right rail sections are now `Now`, `Strategies`, `Health` with dense scanability.

### Unit 079 — Proposal card clarity

- Uniform proposal header + policy/risk line + primary action row + JSON toggle.

### Unit 080 — Safe simulation preflight

- Bankr proposals require simulation before execute in UI.

### Unit 081 — OpenClaw quick action lane

- OpenClaw path is visible as the main guidance row; advanced tools are optional.

### Unit 082 — Onboarding continuity

- Start-here checklist + persistent dismiss flow remains pinned in right rail.

### Unit 083 — OpenClaw intent map guard

- Added `docs/openclaw-intent-map.md`.
- Added `scripts/check-openclaw-intent-map.mjs`.

### Unit 084 — Revenue preset lane

- Added quick prompt inserts for revenue and Bankr planning in OpsBoard.
- Added `scripts/check-revenue-contract.mjs`.

### Unit 085 — Operator guardrail copy pass

- Tightened guidance copy to reinforce manual flow: ask -> approve -> lock -> execute.

### Unit 086 — Flow smoke checks

- Added `scripts/check-operator-surface.mjs`.
- Added `npm run health:visual` + `npm run health:fast` lanes.

### Unit 087 — Runbook + handoff bundle

- Added `docs/ux/AGENT_RUNBOOK_TEMPLATES.md` with low-cost execution templates.

### Unit 088 — Proof to Work one-click handoff

- Completed proof panel linkage to create a Work item directly from a built proof.
- Added attach-to-existing Work ID action from `/proof`.
- Added explicit `PROOF_ATTACHED` event compatibility in Work API.

### Unit 089 — Distribute to Work action lane

- Added `Create Work` action on each proof feed item in `/distribute`.
- Uses `/api/proof/verify/[id]` before creating a Work item to keep handoff deterministic.

### Unit 090 — Work card proof visibility

- Work item cards now surface attached proof context (proof id, kind, verify path, timestamp).
- Proof-linked work can be scanned without opening full item JSON.

### Unit 091 — Proof lane machine guard

- Added `scripts/check-proof-lane.mjs` for deterministic proof-flow integrity checks.
- Added `npm run proof:check` and included the check in `health:fast`.
