# Programs (Strategy Presets)

Programs are curated, safe-by-default sequences of actions (trade planning, retire proposals, token ops proposals, verification).
They are intended to be used by:
- Humans via the Cockpit UI
- Agents via the machine-readable endpoint

## Endpoint
- `GET /api/programs` → `{ ok, programs: StrategyProgram[] }`

## Design rules
- Programs **do not** execute funds movement by default.
- Each step may reference an existing API endpoint and include an example body.
- Steps that create proposals should emit a proof-of-action object.

## Next
- Add “Run program” UI that executes steps in order (proposal-only), with per-step approval.
