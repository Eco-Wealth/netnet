# Unit: Infra VPS (apply notes)

This unit adds Docker + deploy docs + kill-switch helpers.

## Files added (safe)
- `docker-compose.yml`
- `netnet/cockpit/Dockerfile`
- `docs/deploy/vps.md`
- `ENV_VPS_APPEND.md`
- `netnet/cockpit/src/lib/policy/killSwitch.ts`
- `netnet/cockpit/src/lib/api/killResponse.ts`

## Manual wiring (2–3 small edits)
Wire guards into existing routes:

### Guard agent surfaces
In:
- `netnet/cockpit/src/app/api/agent/carbon/route.ts`
- `netnet/cockpit/src/app/api/agent/trade/route.ts`

Add:
- `import { isKilled } from "@/lib/policy/killSwitch";`
- `import { killed } from "@/lib/api/killResponse";`
- early return: `if (isKilled("ALL")) return killed("ALL");`

### Guard spend endpoints
In:
- `netnet/cockpit/src/app/api/bridge/retire/route.ts`

On POST/execution path add:
- `if (isKilled("SPEND")) return killed("SPEND");`

(Any future token-op execution routes should also be SPEND-guarded.)

## Env
Append keys from `ENV_VPS_APPEND.md` into `.env.example` and your VPS `.env`.
