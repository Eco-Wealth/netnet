# Bridge.eco integration (Unit 4)

This repo provides server-side API routes under `/api/bridge/*` that proxy to Bridge.
These routes are intentionally thin wrappers with:

- strict input validation (zod)
- timeouts and friendly errors
- 60s caching for registry/projects
- normalized error responses: `{ ok:false, error:{ code, message, details? } }`

## Env vars

- `BRIDGE_API_BASE_URL` (default: `https://api.bridge.eco`)
- `BRIDGE_API_KEY` (optional; forwarded via `Authorization: Bearer` and `X-API-Key`)
- `BRIDGE_TIMEOUT_MS` (default: `12000`)

## Routes

- `GET /api/bridge/registry`
- `GET /api/bridge/projects?type=&chain=&token=&search=`
- `POST /api/bridge/quote`
- `POST /api/bridge/retire` (safe-by-default: requires `beneficiaryName` + `reason`)
- `GET /api/bridge/tx?hash=0x...`

## Notes

Bridge’s upstream URL paths may differ depending on your account/environment.
If Bridge uses different paths, change them in:
- `netnet/cockpit/app/api/bridge/*/route.ts`
