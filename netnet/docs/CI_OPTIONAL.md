# Optional CI (how to enable)

Your current PAT cannot push workflow files to `main` without the `workflow` scope.
This unit keeps workflows **out of** `.github/workflows/` by default.

## Enable in a PR
1) Create a branch (example): `ci/enable`
2) Copy:
   - `ci-optional/.github/workflows/ci.yml` -> `.github/workflows/ci.yml`
   - `ci-optional/.github/workflows/release.yml` -> `.github/workflows/release.yml`
3) Commit + push branch
4) Open PR and let Actions run

If you later want to land workflows into `main`, use a PAT that includes `workflow` scope
(or ask an org admin to add them).
