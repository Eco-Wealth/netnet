# Regen Registry Project Generator (proposal-only)

This endpoint generates a **project packet** intended to be copied into a Regen Registry project create flow later.

- `GET /api/agent/regen/projects?action=info`
- `POST /api/agent/regen/projects`

The response includes:
- `packet` (`netnet.regen.project.v1`)
- `proof` (`netnet.proof.v1`) for sharing/audit.

No submission is performed.
