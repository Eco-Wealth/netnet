# Unit U — API Contract Test Suite (opt-in)

Goal: Add a minimal, low-friction contract test scaffold that does **not** affect builds/CI.

## What it adds
- `netnet/cockpit/tests/api_contracts_smoke.test.ts` using Node’s built-in test runner.

## How to run
Terminal 1:
- `cd netnet/cockpit`
- `npm run dev`

Terminal 2:
- `cd netnet/cockpit`
- `node --test tests/api_contracts_smoke.test.ts`

Optional:
- `NETNET_TEST_BASE_URL=http://localhost:3001 node --test tests/api_contracts_smoke.test.ts`
