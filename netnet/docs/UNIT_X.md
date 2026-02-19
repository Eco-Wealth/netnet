# Unit X — Security/Policy Audit Expansion (safe scaffold)

Goal: Improve *audit quality* (operator remediation steps) without changing runtime behavior yet.

## What it adds
- `docs/SECURITY_AUDIT_PLAYBOOK.md`
- `scripts/audit_check.sh`

## Next (future code unit)
- Extend `/api/security/audit` to include:
  - policy snapshot + autonomy mode
  - env presence checks (no values)
  - capability flags (which endpoints are propose-only vs execute)
  - spend caps & allowlists summary
