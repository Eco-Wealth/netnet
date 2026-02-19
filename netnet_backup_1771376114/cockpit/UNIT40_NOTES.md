# Unit 40 — Labor coordination UI (Ops Console)

Adds an `/ops` page that sits on top of the Unit 39 work system.

- Kanban-style queue (OPEN / IN_PROGRESS / BLOCKED / DONE)
- Filters (q/status/owner)
- Create work form (title/kind/priority/SLA/acceptance)
- Inline updates (status/priority/owner)

Depends on:
- Unit 39 API: `GET/POST /api/work` and `PATCH /api/work/:id`
