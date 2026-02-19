# netnet — Regen Registry Project Packet (read-only)

This skill produces a **project packet** suitable for preparing a Regen Registry project or methodology discussion.
It is **safe-by-default**: it does not write to chain, it does not submit to any registry, and it requires explicit operator approval for any execution outside netnet.

## Endpoint
- `GET /api/agent/regen?action=info`
- `GET /api/agent/regen?action=template`
- `GET /api/agent/regen?action=chains`
- `GET /api/agent/regen?action=validate&packet=<urlencoded-json>`

## Output contract (template)
`action=template` returns:

```json
{
  "ok": true,
  "packet": {
    "schema": "netnet.regen.project_packet.v1",
    "createdAt": "2026-02-09T00:00:00.000Z",
    "operator": { "name": "...", "org": "...", "contact": "..." },
    "project": { "name": "...", "summary": "...", "location": "...", "sdgs": ["SDG 13"] },
    "mrv": { "approach": "...", "dataSources": ["satellite"], "frequency": "Quarterly" },
    "commercialization": { "buyerClass": "...", "contractPath": "...", "targetVintage": "2026" },
    "safety": { "readOnly": true, "note": "..." }
  }
}
```

## Operator workflow
1. Generate packet via `action=template`
2. Fill in real details (project name, summary, MRV approach)
3. Validate via `action=validate`
4. Hand packet to the human/operator or to an external registry submission process (out of scope)

## Notes
- Regen chain + repos are referenced for context; netnet does not assume a specific registry API.
