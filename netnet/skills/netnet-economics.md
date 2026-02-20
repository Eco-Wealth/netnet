# netnet — Regenerative Economics (Unit 37)

Purpose: give the agent + operator a shared, machine-readable vocabulary for regenerative value creation.

This is **planning-only**. It never moves funds and never executes actions.

## Catalog
**GET** `/api/econ/capitals`

Returns:
- capitals[]: Natural, Social, Human, Built, Financial, Cultural, Political
- principles[]: Do No Harm, Measure→Act, Additionality, Permanence, Leakage Control, Local Benefit, Transparency, Operator Accountability

## Action → Capital Delta
**POST** `/api/econ/delta`

Body:
```json
{
  "id": "optional_action_id",
  "type": "retire.carbon" ,
  "summary": "Retire 5 tonnes via Bridge to neutralize agent inference",
  "tags": ["klima", "bridge", "receipt"],
  "principlesApplied": ["measure_then_act", "transparency", "operator_accountability"],
  "deltas": [
    {"capital":"natural","score": 3, "confidence":"MEDIUM", "rationale":"Verified retirement produces durable natural benefit", "evidence":[{"kind":"tx","ref":"0x..."}]},
    {"capital":"financial","score": -1, "confidence":"HIGH", "rationale":"Costs USDC; acceptable within budget"}
  ]
}
```

Response:
```json
{
  "ok": true,
  "schema": "netnet.econ.delta.v1",
  "action": {"id":"...","type":"...","summary":"..."},
  "principlesApplied": ["..."],
  "deltas": [{"capital":"natural","score":3,"confidence":"MEDIUM","rationale":"..."}],
  "nextAction": "Review deltas; attach evidence; approve or revise.",
  "generatedAt": "2026-02-08T00:00:00.000Z"
}
```

## Operator Standard
Every non-trivial action should eventually include:
- a delta packet (this endpoint)
- a proof-of-action object (existing proof composer)
- a cost/budget line item (inference + fees + micro-retire policy)
