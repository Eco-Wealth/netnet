# Agent Runbook Templates

These templates keep low-cost iterations consistent.

## Baseline repair run

1. Run `npm -C <cockpit> run build`.
2. Capture first error and 20 lines of context.
3. Apply the smallest fix.
4. Re-run build.
5. Stop when baseline is green.

## Operator flow check run

1. Validate `Now`, `Strategies`, and `Health` sections exist.
2. Validate proposal actions: `Approve`, `Lock Intent`, `Generate Plan`, `Execute`.
3. Validate Bankr proposals include `Simulate` before execute.
4. Confirm no overlay blocks composer or right-rail controls.

## Revenue guard run

1. Validate `/api/agent/revenue` is present in SOT with `POST`.
2. Validate owner/skill metadata is non-empty.
3. Validate connector matrix and intent map still include Bankr + revenue surfaces.

## Done criteria

- `npm run health:fast` passes.
- `npm run health:revenue` passes.
- `npm run health:visual` passes.
