# Unit D — Work API Contract Alignment

Goal: Align client helpers + Asset Workspace calls with the canonical Work API.

## What this changes
- `src/lib/work/client.ts` now posts events to `/api/work/[id]` (not `/events`)
- Work create returns `{ ok, id, item }` (server already returns `item`; this unit ensures `id` is included)
- Asset Workspace creates work items via `/api/work` (not `/api/work/items`)

## Apply
From repo root:
- Unzip this patch zip at repo root (it contains file paths under `netnet/cockpit/...`).

## Verify
- `cd netnet/cockpit && npm run dev`
- Open:
  - `/workbench` and run any action that creates/appends work → should succeed
  - `/assets/<chain>/<address>` and use “Create work” (or equivalent) → should succeed

## Commit suggestion
`fix(work): align client + workspace to canonical /api/work contracts`
