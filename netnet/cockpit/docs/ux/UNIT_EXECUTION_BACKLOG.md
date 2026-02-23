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

### Unit 092 — Work proof-aware filters

- Added `/api/work` filters for `hasProof` and `proofId`.
- Work list search now includes proof IDs and verify URLs from attached proof events.
- `/work` page now has proof-linked filtering controls.

### Unit 093 — Verify page work handoff

- Added `/proof/[id]` work handoff panel:
  - create work item from verified proof
  - attach verified proof to existing work ID
- Added quick open link into `/work` query flow.

### Unit 094 — Distribute persisted work links

- `/distribute` now persists proof→work links in localStorage.
- Proof cards show direct `Open Work` action once a linked work item exists.

### Unit 095 — Operator proof lane shortcuts

- Added top-bar shortcuts in Operator seat for:
  - `/proof`
  - `/distribute`
  - `/work`

### Unit 096 — Health proof lane

- Added `scripts/health-proof.mjs` to run:
  - cockpit build
  - cockpit typecheck
  - proof lane guard
  - operator surface guard
- Added `npm run health:proof`.

### Unit 097 — Work filter URL sync

- `/work` filter state now syncs into URL query params (`q`, `hasProof`, `proofId`).
- Added Enter-to-apply behavior for filter inputs.

### Unit 098 — Work card verify action

- Work cards now expose an inline `Open` action for attached proof verify links.
- Preserved card-level clickability while allowing direct verify navigation.

### Unit 099 — Verify API navigation hints

- `/api/proof/verify/[id]` now returns deterministic navigation links:
  - proof page
  - verify API route
  - proof-scoped work query
  - distribute anchor

### Unit 100 — Distribute link-state filters

- Added linked/unlinked handoff filter in `/distribute`.
- Search now includes linked work IDs in addition to proof fields.

### Unit 101 — Proof lane guard hardening

- Extended `scripts/check-proof-lane.mjs` to enforce:
  - verify API navigation links
  - distribute link-state filter presence
  - work card verify action
  - work page URL-sync behavior

### Unit 110 — OpenClaw dashboard agent-readiness integration

- Add a dedicated Operator setup flow for OpenClaw dashboard compatibility:
  - environment checklist
  - connector/permission checks
  - schedule smoke test
  - run/log verification
- Reduce terminal-first setup by mapping routine actions to deterministic UI controls.
- Add health checks and runbook coverage so agents can bootstrap and recover without manual shell loops.

### Unit 111 — Server-authoritative ops role boundary

- `/ops/control` command execution now resolves effective role on server env only.
- Added access-context readout so requested role vs enforced role is explicit.

### Unit 112 — Telegram hard proposal-only regen fence

- Telegram-sourced regen compute calls no longer auto-retire credits.
- Telegram flow remains read/propose-only while preserving proof logging.

### Unit 113 — MCP readiness lane in ops control

- Added deterministic MCP checks for:
  - Regen MCP
  - Registry Review MCP
  - Regen KOI MCP
  - Regen Python MCP
- Wired MCP readiness into OpenClaw bootstrap and status UI.

### Unit 114 — MCP guard in health-fast

- Added `scripts/check-mcp-connectors.mjs` for MCP matrix/env/types/index integrity.
- Included MCP checks in `health:fast` and added `npm run mcp:check`.

### Unit 115 — Social sequence prompt lane

- Added Operator quick prompt for social autopublish sequencing:
  - YouTube -> X -> Instagram -> Facebook
- Kept flow proposal-first (prompt insertion only, no execution wiring changes).

### Unit 116 — Codex unit runner bridge in ops control

- Added prompt-driven planning in `/ops/control`:
  - Enter a goal
  - Generate deterministic command sequence
  - Run through existing guarded sequence execution
- Keeps server-authoritative role boundary and existing command allowlist.

## Proposed

### Unit 121 — Social autopublish sequence (YouTube -> X -> Instagram -> Facebook)

- Add seamless post scheduling and execution-ready proposal templates for social distribution.
- Enforce deterministic sequence order:
  1. YouTube
  2. X
  3. Instagram
  4. Facebook
- Keep posting proposal-first with approval + execution gates, while making scheduling effortless in Operator UI.
