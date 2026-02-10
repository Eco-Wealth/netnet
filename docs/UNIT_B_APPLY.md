# Unit B — Compile Blockers Cleanup (apply script)

This unit fixes the three compile blockers called out by your audit:

1) `netnet/cockpit/src/app/api/agent/carbon/route.ts` malformed import block
2) `netnet/cockpit/src/lib/revenue/index.ts` imports `@/lib/incentives` (missing)
3) `netnet/cockpit/src/lib/bankr/launcher.ts` imports `httpJson`/`env` that don’t exist

## Apply

From repo root (`~/netnet`):

```bash
unzip -o netnet_unitB_compile_blockers_apply_script.zip
bash scripts/unitB_apply.sh
```

Then:

```bash
cd netnet/cockpit
npm run dev
```

## Commit suggestion

```bash
git add netnet/cockpit/src/app/api/agent/carbon/route.ts \
        netnet/cockpit/src/lib/revenue/index.ts \
        netnet/cockpit/src/lib/bankr/launcher.ts \
        scripts/unitB_apply.sh \
        docs/UNIT_B_APPLY.md
git commit -m "fix(build): resolve carbon/revenue/bankr compile blockers (Unit B)"
git push
```
