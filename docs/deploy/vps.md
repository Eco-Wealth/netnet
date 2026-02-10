# VPS deploy (Docker Compose)

## What you get
- Root `docker-compose.yml`
- Cockpit builds + runs inside Docker (`netnet/cockpit/Dockerfile`)
- Healthcheck calls `/api/health`
- Logs retained by Docker (`json-file` rotation)
- Kill switches via env:
  - `NETNET_KILL_SWITCH=1` blocks guarded agent endpoints (503)
  - `NETNET_SPEND_KILL_SWITCH=1` blocks spend-capable operations (503)

## Golden path (Ubuntu LTS)
1) Install Docker + Compose plugin
2) Clone repo and `cd` into it
3) Create `.env` from `.env.example` (append `ENV_VPS_APPEND.md` keys)
4) `docker compose up -d --build`
5) Verify: `curl http://localhost:3000/api/health`

## Updating
- `git pull`
- `docker compose up -d --build`

## Rollback
- `git checkout <previous-commit>`
- `docker compose up -d --build`

## Logs
- `docker logs -f netnet-cockpit`
