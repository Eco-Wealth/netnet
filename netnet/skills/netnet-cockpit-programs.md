# netnet-cockpit: programs

This skill provides strategy presets as structured data so an agent can choose a vetted program and run steps safely.

## Read
- `GET /api/programs`

## Intended usage
1) Fetch programs
2) Select by tags + autonomy level
3) Execute steps in PROPOSE_ONLY unless policy explicitly allows execution

## Safety
- Do not execute token ops, trades, or retirements without operator approval unless autonomy is EXECUTE_WITH_LIMITS and the policy engine permits it.
