# Agent skills (OpenClaw)

This folder contains **copy/paste skill files** for agent runtimes (OpenClaw-style) that can operate `netnet-cockpit` via its HTTP API.

## What’s here

- `netnet-cockpit.md` — main skill: carbon estimate → quote → retire → status, plus proof generation.
- `netnet-cockpit-carbon.md` — carbon-only, minimal surface.
- `netnet-cockpit-trade-stub.md` — trading connector scaffold (DRY_RUN only by default).

## How to use

1. Run the app locally (or point to your deployed URL):
   - Local: `http://localhost:3000`
2. Give the agent one of these skill files as context, plus:
   - `NETNET_BASE_URL` (e.g. `http://localhost:3000`)
   - Optional envs documented in the skill (paywall + Bridge).

## Safety posture

- Any action that could move funds must be **explicitly requested by the operator**.
- Trading endpoints are **disabled by default** and operate in **DRY_RUN** unless enabled with caps.
