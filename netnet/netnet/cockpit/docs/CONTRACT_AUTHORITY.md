# Contract Authority

Canonical API contract authority for cockpit routes is:
- `netnet/cockpit/docs/api-contract-source-of-truth.json`

Scope:
- `netnet/cockpit/src/app/api/**`

## Rules

1. Route behavior in `src/app/api/**` and the SOT JSON must match.
2. Skill docs in `skills/**` should describe workflow/safety intent, not duplicate full request/response schemas.
3. Route docs in `netnet/cockpit/docs/**` should summarize usage and link to SOT for exact fields.
4. Any route addition/removal must update SOT in the same change.
5. Run `npm run contracts:check` before merging contract-related changes.
