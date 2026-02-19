# Unit W — Optional CI Branch (non-enforced)

Goal: Provide CI workflow files without requiring `workflow` PAT scope on `main`.

## What it adds
- `ci-optional/.github/workflows/ci.yml`
- `ci-optional/.github/workflows/release.yml`
- `docs/CI_OPTIONAL.md` explaining how to use them

## Intended usage
- Create a new branch (e.g. `ci/enable`)
- Copy `ci-optional/.github/workflows/*` into `.github/workflows/`
- Open a PR; GitHub Actions will run on that branch/PR.
