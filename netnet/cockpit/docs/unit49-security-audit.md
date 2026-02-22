# Unit 49 — Security Self-Audit

Adds a read-only security self-audit endpoint and UI page.

## Endpoints
- `GET /api/security/audit`
  - returns `{ ok, audit, correlationId }`
  - does not return secrets

## UI
- `/security`
  - displays audit summary + remediation hints

## Notes
- This is *not* a vulnerability scanner. It is a configuration/guardrails sanity check.
- Treat WARN as “review before production”, FAIL as “block”.
