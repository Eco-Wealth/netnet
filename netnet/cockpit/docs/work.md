# Work System (Unit 39)

This adds a minimal *work queue* to netnet-cockpit:

- UI: `/work`
- API:
  - `GET /api/work` → list items
  - `POST /api/work` → create
  - `GET /api/work/:id` → fetch
  - `PATCH /api/work/:id` → update fields (status, owner, etc.)
  - `POST /api/work/:id` → append an audit event (comment/escalation/approval signal)

Notes:
- Store is in-memory (dev-friendly). Production persistence is a later unit.
- This is a coordination layer: it does not execute funds-moving actions.
