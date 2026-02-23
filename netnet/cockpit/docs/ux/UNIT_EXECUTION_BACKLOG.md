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

### Unit 117 — Vealth work-order contract intake

- Added `/ops/control` action to create machine-readable work orders from goal input.
- Work order contract includes:
  - deterministic command lane
  - acceptance checks
  - proposal-first constraints (approval + intent lock required)
  - budget cap and required output artifacts
- Contract is persisted in Work event audit trail (`APPROVAL_REQUESTED` patch).

### Unit 118 — Vealth dispatch adapter + liquidity pledge metadata

- Added `/ops/control` actions for Vealth lifecycle controls:
  - dispatch
  - heartbeat
  - stop
  - status refresh
- Dispatch writes deterministic event patches into Work for auditability.
- Added liquidity pledge metadata in work-order incentives:
  - mechanism `ecowealth-pledge-v0`
  - Base chain (`8453`) + ECO token baseline
  - optional partner token + ECO matched cap (wei)
- Added operator docs and env hooks for pledge-aware dispatch setup.

### Unit 119 — Vealth verification gate + acceptance checks

- Added `/ops/control` verification action for work-order acceptance checks:
  - replays deterministic command lane from contract acceptance checks
  - records pass/fail and exit-code evidence in Work audit events
  - computes payout eligibility from required checks + payout cap
- Added UI controls in Ops Control to run verification and view required-check pass ratio.

### Unit 120 — Vealth payout authorization + queue tick automation lane

- Added `/ops/control` payout authorization action:
  - requires successful verification
  - enforces payout cap from work-order incentives
  - writes payout authorization into Work event patch
- Added `/ops/control` queue tick action:
  - deterministic next-action resolver (`dispatch` -> `verify` -> `payout`)
  - dry-run mode for operator preview
  - execute mode for one-step progression with audit-safe patches
- Added UI controls for payout amount, payout authorize, and queue tick dry-run/execute.

### Unit 121 — Social autopublish sequence (YouTube -> X -> Instagram -> Facebook)

- Added `/ops/control` social autopublish work-order action:
  - builds deterministic sequence metadata in work-order contract
  - includes scheduling/topic/tone/CTA fields and proposal prompt payload
  - stores connector availability matrix for YouTube/X/Instagram/Facebook
- Added Ops Control UI form for one-click social work-order creation with strict sequence order.
- Kept flow proposal-first and approval-gated; no automatic social posting execution was added.

### Unit 122 — Vealth queue snapshot + load-context controls

- Added `/ops/control` queue snapshot action to list active Vealth work orders with:
  - dispatch state
  - verification/payout completion flags
  - social lane flag
- Added `/ops/control` work-order context action for loading existing work ids back into the control lane.
- Added UI panel to browse queue items and load context without terminal work.

### Unit 123 — Vealth bounded batch tick runner

- Added `/ops/control` batch tick action with bounded loop:
  - dry-run mode (single deterministic preview)
  - execute mode (multi-step progression, bounded by limit)
- Batch runner reuses existing queue tick logic and keeps strict approval-first behavior.
- Added UI controls for batch dry-run and batch execute with summarized outcomes.

### Unit 124 — Social autopublish readiness guard lane

- Added `/ops/control` social readiness action that checks connector route coverage for:
  - YouTube
  - X
  - Instagram
  - Facebook
- Added readiness status UI in queue panel to keep social posting lane explicit and auditable.
- Missing connectors now surface as explicit readiness gaps while preserving proposal-first flow.

### Unit 125 — Vealth stale-work watchdog lane

- Added `/ops/control` stale guard action with configurable stale threshold (hours).
- Stale guard scans running/dispatched queue items and can:
  - dry-run for preview
  - execute to append deterministic `ESCALATED` stale-guard events
- Added queue-panel controls and stale summary output for operator visibility.

### Unit 126 — Social autopublish packet builder

- Added `/ops/control` action to build draft social proposal packets from a social-enabled work order.
- Packet builder returns deterministic channel payloads in strict order:
  - YouTube
  - X
  - Instagram
  - Facebook
- Added UI controls to build and inspect social packets as JSON artifacts.

### Unit 127 — Vealth handoff bundle generator

- Added `/ops/control` action to generate a machine-readable handoff bundle for selected work orders.
- Bundle includes:
  - contract
  - dispatch/verification/payout snapshots
  - next deterministic queue action
  - social connector availability
- Added UI controls to build and inspect handoff bundle JSON for agent handoff.

### Unit 128 — Bankr integrity drift guard + health-fast lane

- Added `scripts/check-bankr-integrity.mjs` to enforce canonical Bankr alignment across:
  - skills registry
  - API SOT routes/ownership
  - LLM canonical action/route guidance
  - strict proposal action/route map
  - Bankr adapter map
  - execution replay/write guards
  - policy simulate allowance
- Added `npm run bankr:check` and wired it into:
  - `drift:check`
  - `health:fast`

### Unit 129 — Bankr integration tests (read/propose surfaces)

- Added Playwright integration tests:
  - `tests/bankr-integration.spec.ts`
- Coverage includes:
  - token info read route
  - token actions catalog/propose-only lane
  - unknown action rejection
  - wallet state route (deterministic mock lane in test env)
- Updated Playwright webserver env defaults for deterministic Bankr test behavior.

### Unit 130 — Bankr execution boundary hardening + tests

- Added write replay guard in `store.executeProposal`:
  - blocks re-execution of previously successful write actions
  - records write execution markers in proposal metadata
- Added execution-boundary replay check in `src/lib/operator/executor.ts`.
- Added Playwright boundary tests:
  - `tests/bankr-execution-boundary.spec.ts`
  - covers launch bad-request rejection and `execute_privy` write-lane guards.

### Unit 131 — Bankr readiness lane in Ops Control

- Added server action `runBankrReadinessCheckAction` in Ops Control:
  - checks canonical Bankr routes exist
  - checks write-lane env readiness (`PRIVY_APP_ID`, `PRIVY_APP_SECRET`)
  - checks policy decisions for canonical Bankr actions
- Added a dedicated Bankr readiness panel in `/ops/control` with one-click run + detailed env/route/policy output.
- Added health command entries:
  - `bankr_readiness` -> `npm run bankr:check`

### Unit 132 — Bankr smoke suite lane

- Added `scripts/health-bankr.mjs` to run deterministic Bankr checks:
  - `bankr:check`
  - cockpit build
  - cockpit typecheck
  - targeted Bankr Playwright smoke tests
- Added `npm run health:bankr` in root package scripts.
- Added Ops Control command:
  - `bankr_smoke` -> `npm run health:bankr`
- Extended goal-to-command planner with Bankr intent mapping for `bankr_readiness` and `bankr_smoke`.
