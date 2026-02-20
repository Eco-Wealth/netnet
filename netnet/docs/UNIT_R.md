# Unit R — Work System Deepening (store + contracts)

Purpose
- Provide a canonical in-memory Work store implementation to back `/api/work` routes.
- Keep the contract stable for both humans and agents (create/list/get/update/append-event).

Notes
- This is intentionally in-memory (process-local). Persistence adapter can be added later.
