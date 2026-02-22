# Unit 110 — OpenClaw Dashboard Agent-Readiness Integration

Implement this unit as a focused enablement pass.  
Stop after commit only.

## Objective

Make netnet easy for OpenClaw-driven operators to use without terminal-heavy setup:

- reliable dashboard onboarding
- deterministic setup checks
- minimal manual shell work for cron/schedule workflows
- clear run/log/status loop from UI

This unit is integration + UX hardening only.  
No policy bypasses. No execution-gate changes. No DB schema migrations.

## Constraints

- No new backend architecture.
- No execution auto-approval.
- No weakening of proposal/intent/plan/execute discipline.
- No new dependencies.
- Keep current routes and existing behavior intact.

## Scope

Primary targets:

- `netnet/cockpit/src/app/ops/control/*`
- `netnet/cockpit/src/app/ops/page.tsx`
- `netnet/cockpit/src/components/*` (small UI helpers only if needed)
- `netnet/cockpit/.env.example`
- `netnet/cockpit/docs/*` (runbook + setup notes)
- `netnet/scripts/*` for deterministic health checks

## Requirements

### 1) OpenClaw setup card (UI)

Add an "OpenClaw Setup" section in `/ops/control` with:

- required env key checklist
- connection test button
- scheduler/cron test button
- permission guard check button
- last check timestamp + pass/fail status

Use existing command/action surfaces (no raw terminal text output as primary UX).

### 2) Agent bootstrap workflow

Add a compact "first run" path:

- Step 1: verify env
- Step 2: verify connectors
- Step 3: run smoke sequence
- Step 4: confirm schedule lane
- Step 5: confirm log visibility

Each step must map to deterministic checks and show actionable failure text.

### 3) Health check integration

Extend `health:fast` or a sibling check so OpenClaw readiness can be validated non-interactively:

- config present
- connector routes reachable (internal)
- command flow path available
- proof/log path available

### 4) Runbook for operators/agents

Add a short runbook with:

- setup prerequisites
- known failure modes
- recovery steps
- expected healthy output

### 5) Safety

Ensure setup/testing actions remain read/propose where applicable.  
No execution path should bypass existing approval + intent lock + policy checks.

## Validation

Run:

1. `npm -C netnet/cockpit run build`
2. `cd netnet/cockpit && npx tsc --noEmit`
3. `npm run health:fast`

All must pass.

## Commit

`Unit 110: openclaw dashboard agent-readiness integration`
