# netnet-cockpit-security (read-only)

Purpose: quick self-audit of agent safety posture (configuration + guardrails) without revealing secrets.

## Call
GET /api/security/audit

## Output
- ok: boolean
- audit.summary: counts of pass/warn/fail
- audit.checks[]: each check includes remediation text when needed

## Operator use
- Run this before enabling higher autonomy.
- If autonomy is EXECUTE_WITH_LIMITS, verify kill-switches and caps are set.
