# Unit L — Mobile-First Action Zones

Adds:
- `MobileActionDock` (fixed bottom thumb-zone action bar)
- `Insight` (tiny hover/focus helper; native title fallback on mobile)
- Compact rhythm helpers in `globals.css` (`nw-*` utilities)

Integration pattern:
- Add `className="nw-has-dock"` to the page root wrapper.
- Render `<MobileActionDock> ...primary actions... </MobileActionDock>` near the end of the page component.

No behavior changes are forced; this is an opt-in UI primitive.
