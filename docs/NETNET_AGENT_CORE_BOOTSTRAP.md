# NetNet Agent Core Bootstrap

Use `skills/netnet-agent-core` to run repeatable, auditable execution loops for coding tasks.

## Skill location
`/Users/EcoWealth/dev/netnet/skills/netnet-agent-core`

## Quick start
1. Create work order:
```bash
npm run agent:create-work-order -- \
  --id netnet-demo-001 \
  --objective "Harden one API route without contract drift" \
  --constraint "Do not change request/response schema" \
  --deliverable "Implement route guard" \
  --acceptance "npm run drift:check" \
  --out /tmp/netnet-work-order.json
```

2. Validate work order:
```bash
npm run agent:validate-work-order -- /tmp/netnet-work-order.json
```

3. Execute task and write run report JSON.

4. Grade run:
```bash
npm run agent:grade-run -- /tmp/netnet-work-order.json /tmp/netnet-run-report.json
```

## Required gates for API/policy/contract work
- `npm run contracts:check`
- `npm run policy:integrity`
- `npm run policy:routes`
- `npm run drift:check`
