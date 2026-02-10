#!/usr/bin/env bash
set -e

echo "Health check"
curl -fsS http://localhost:3000/api/health

echo "Trade info"
curl -fsS "http://localhost:3000/api/agent/trade?action=info"

echo "Regen template"
curl -fsS "http://localhost:3000/api/agent/regen?action=template"

echo "Smoke OK"
