# Unit 50 — CI / Release plumbing

## What this adds
- GitHub Actions CI that installs dependencies and runs:
  - cockpit lint/typecheck (if scripts exist)
  - `npm run build` for cockpit
  - cockpit smoke script (best-effort)
- Dependabot for root + cockpit `npm` dependencies
- Optional manual tag workflow for releases

## Notes
- CI uses `.nvmrc` for Node version.
- Install steps use `--legacy-peer-deps` to match local workflow.
- If you want CI to be strict, remove the `|| true` around `audit-check.mjs`.
