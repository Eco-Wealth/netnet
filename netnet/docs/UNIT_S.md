# Unit S — Programs Runner (proposal-only)

Adds:
- POST `/api/programs/run` to generate a proposed run plan (no execution).
- UI at `/programs/run` to select a program and run it (proposal output only).

Safety:
- Always emits `requiresApproval: true`.
- Never broadcasts transactions.
