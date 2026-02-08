# Agent API (Carbon)

Endpoint: `/api/agent/carbon`

## Guardrails
- Rate limited (best-effort)
- Safe-by-default: POST requires `beneficiaryName` and `reason`
- No automatic fund movement: POST returns payment instructions only

## Examples
```bash
curl -s "http://localhost:3000/api/agent/carbon?action=info" | jq .
curl -s "http://localhost:3000/api/agent/carbon?action=estimate&computeHours=10&modelSize=small" | jq .
curl -s "http://localhost:3000/api/agent/carbon?action=projects" | jq .
curl -s "http://localhost:3000/api/agent/carbon?action=quote&projectId=demo&amount=1&chain=base&token=USDC" | jq .
curl -s -X POST "http://localhost:3000/api/agent/carbon" -H "content-type: application/json"   -d '{"projectId":"demo","amount":1,"chain":"base","token":"USDC","beneficiaryName":"EcoWealth","reason":"operator test"}' | jq .
```
