# NetNet Acceptance Gates

Use these gates when touching `netnet/cockpit/src/app/api/**`, policy files, or contract files.

## Required checks
1. Contract source-of-truth integrity:
```bash
npm run contracts:check
```

2. Policy integrity:
```bash
npm run policy:integrity
```

3. Route policy enforcement:
```bash
npm run policy:routes
```

4. Full drift check (preferred aggregate):
```bash
npm run drift:check
```

## Evidence format
Record each gate in `acceptance_results` with:
- `name`
- `passed`
- `evidence` command string or output pointer
