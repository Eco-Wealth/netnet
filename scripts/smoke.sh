#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "[smoke] health"
curl -fsS "$BASE_URL/api/health" >/dev/null
echo "  ok"

echo "[smoke] paywall (expect 402 unless X402_DEV_BYPASS=true)"
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/proof-paid" || true)"
echo "  /api/proof-paid => $HTTP_CODE"
if [[ "${X402_DEV_BYPASS:-false}" != "true" && "$HTTP_CODE" != "402" ]]; then
  echo "  expected 402 (set X402_DEV_BYPASS=true to bypass)"
  exit 1
fi

echo "[smoke] agent carbon surface"
curl -fsS "$BASE_URL/api/agent/carbon?action=info" >/dev/null
echo "  ok"

echo "[smoke] trade stub surface"
curl -fsS "$BASE_URL/api/agent/trade?action=info" >/dev/null
echo "  ok"

echo "[smoke] bridge registry (skip if BRIDGE_ECO_API_KEY not set)"
if [[ -n "${BRIDGE_ECO_API_KEY:-}" ]]; then
  curl -fsS "$BASE_URL/api/bridge/registry" >/dev/null
  echo "  ok"
else
  echo "  skipped (set BRIDGE_ECO_API_KEY)"
fi

echo "[smoke] done"
