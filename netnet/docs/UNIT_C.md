# Unit C — Server Fetch Host Safety

This unit removes `http://localhost:3000` hardcoding in server components by using a server-safe base URL derived from request headers.

## Files
- `netnet/cockpit/src/lib/server/baseUrl.ts` (new)
- `netnet/cockpit/src/app/revenue/page.tsx` (replace)
- `netnet/cockpit/src/app/security/page.tsx` (replace)
- `netnet/cockpit/src/app/token/page.tsx` (replace)

## Apply
From repo root:
```bash
unzip -o netnet_unitC_server_fetch_host_safety_patch.zip
```

## Verify
```bash
cd netnet/cockpit
npm run dev
# Open /revenue, /security, /token
```

## Commit
```bash
git add netnet/cockpit/src/lib/server/baseUrl.ts           netnet/cockpit/src/app/revenue/page.tsx           netnet/cockpit/src/app/security/page.tsx           netnet/cockpit/src/app/token/page.tsx           docs/UNIT_C.md
git commit -m "fix(ssr): remove localhost hardcoding in server fetches (Unit C)"
git push
```
