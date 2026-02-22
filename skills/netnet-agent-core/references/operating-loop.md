# Operating Loop

## Phase 1: Contract
- Parse request into objective, constraints, deliverables, and acceptance tests.
- Declare assumptions explicitly in the work order.
- Stop if objective or acceptance tests are not measurable.

## Phase 2: Plan
- Keep steps minimal and sequence from lowest to highest risk.
- Separate read-only exploration from file edits.
- Keep edits scoped to files needed for objective.

## Phase 3: Execute
- Implement only requested scope.
- Preserve existing behavior outside scope.
- Prefer additive or minimal-diff changes.

## Phase 4: Verify
- Run required acceptance commands.
- If API routes/contracts changed, run netnet drift checks.
- Capture command-level evidence in run report.

## Phase 5: Report
- Emit run report JSON:
  - status
  - completed deliverables
  - acceptance results with evidence
  - changed files with summary
  - blockers and next actions

## Failure Handling
- If any gate fails, set status to `blocked` or `partial`.
- Never claim completion without acceptance evidence.
