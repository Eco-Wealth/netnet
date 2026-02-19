# netnet-cockpit — Regen Registry Project Generator (proposal-only)

Purpose: generate a **registry-ready project packet** (and a proof object) without submitting anything.

## Endpoint
- `GET /api/agent/regen/projects?action=info`
- `POST /api/agent/regen/projects`

## Safety
- Always **proposal-only**.
- No on-chain, no registry submission, no funds movement.

## Minimal POST body
```json
{
  "title": "Watershed restoration for municipal water district",
  "summary": "Riparian restoration + erosion control to reduce turbidity and protect reservoirs.",
  "buyerClass": "water_district",
  "buyerName": "Example Water District",
  "country": "USA",
  "region": "California",
  "methodology": "TBD",
  "mrvAssumptions": ["Land control secured", "Baseline defined"],
  "requiredFields": ["land_control", "project_boundary", "baseline", "monitoring_plan"],
  "nextSteps": ["Confirm boundary", "Select methodology", "Draft MRV budget"]
}
```

## Response
Returns:
- `packet`: `netnet.regen.project.v1`
- `proof`: `netnet.proof.v1` with `kind=regen_project_packet`
