# netnet cockpit — Regen Project Workspace (proposal-only)

UI: `/regen/projects`

Uses:
- `POST /api/agent/regen/projects` with `action=generate|validate`
- `POST /api/work` to create a work item draft

Safety:
- No registry submission in this unit.
- Intended output is a packet you can paste into a real registry submission flow later.
