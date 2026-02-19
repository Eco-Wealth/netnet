# Unit 41 — Skill→Work integration (every action can create/update work items)

## What this unit adds
- A **Workbench UI** at `/workbench` that:
  - Creates a Work item before executing an action
  - Appends structured events (START/INFO/SUCCESS/ERROR) during the action
  - Saves the current `workId` in localStorage

- A small client helper at `src/lib/work/client.ts` that:
  - `createWork()`
  - `appendWorkEvent()`
  - `withWork()` convenience wrapper

## Assumptions
This unit assumes **Unit 39 (Work System)** provides:
- `POST /api/work` returning `{ ok: true, id: "<workId>" }`
- `POST /api/work/:id/events` accepting `{ type, message, data? }`

If those endpoints are not present yet, Workbench still loads but work creation will silently no-op.

## Why this approach
- No server-route changes required to get value immediately.
- Lets agents or humans wrap *any* existing endpoint call with Work logging.
- Keeps the system safe-by-default: Work logging never blocks execution.

## Quick smoke (manual)
- Start cockpit, open `/workbench`
- Click “Ping /api/health”
- Confirm output shows a `workId` and result JSON
- Open `/ops` (Unit 40) and verify the created work item exists and has events (if Unit 39 UI shows it)
