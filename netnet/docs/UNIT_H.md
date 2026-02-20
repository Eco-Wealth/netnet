# Unit H — Tooltip/Insight Primitive

## Goal
Introduce a reusable tooltip/hover-info primitive that can attach structured guidance to any UI element:
- what it is
- why it matters / impact
- requirements / constraints
- outputs / next steps

This unit is UI-only: no API behavior changes.

## Where
- `netnet/cockpit/src/components/insights/*`

## Usage
```tsx
import { InsightTooltip } from "@/components/insights";

<InsightTooltip
  label="Autonomy"
  insight={{
    what: "Controls whether the agent may read, propose, or execute actions.",
    why: "Prevents accidental spend. Default is PROPOSE_ONLY.",
    requires: ["Operator approval for any execution", "Caps + allowlists when execution enabled"],
    outputs: ["Policy fields used by spend-adjacent routes", "Audit trail via /api/policy"],
  }}
>
  <button className="...">Autonomy</button>
</InsightTooltip>
```

## Mobile behavior
- Hover tooltip on desktop (mouse/trackpad)
- Tap-to-open via `<details>` on touch devices

## Done when
- Components compile
- Can wrap any element without layout shifts
