# Unit K — Action Panels Consistency (UI primitive)

Adds reusable UI primitives for a consistent “action panel” layout across pages:

- `ActionPanel` (header + optional status chip + action row + body + optional footer)
- `StatusChip`
- `OutputBox`

## Files
- `src/components/panels/ActionPanel.tsx`
- `src/components/panels/StatusChip.tsx`
- `src/components/panels/OutputBox.tsx`

## Intended wiring (follow-up unit)
Wrap each major page section in `ActionPanel`:
- `/proof` panel(s)
- `/execute` (paper + launch + future runners)
- `/workbench` runner panel + output panel

Example:

```tsx
import { ActionPanel } from "@/components/panels/ActionPanel";
import { OutputBox } from "@/components/panels/OutputBox";

<ActionPanel
  title="Proof Builder"
  subtitle="Create a deterministic proof object. Proposal-only."
  status="Ready"
  statusTone="good"
  actions={<button>Run</button>}
>
  <OutputBox title="Result">{/* JSON */}</OutputBox>
</ActionPanel>
```
