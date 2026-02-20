# UX Regression Checklist (compact)

Run after any UI-heavy unit.

## Pages
- /proof
- /execute
- /retire
- /governance
- /work
- /workbench
- /wallet
- /token
- /security
- /revenue

## Checks (desktop + mobile)
- Navigation appears once (no duplicate Shell)
- Primary actions are reachable on mobile (thumb zone)
- Tooltips/insights show on hover and on focus (keyboard)
- No clipped text; no overflow in cards/panels
- Contrast: text readable on all panels
- Loading/empty/error states are informative and compact

## Keyboard
- Tab order is logical
- Focus ring visible
- Buttons/inputs reachable without mouse

## Quick API sanity
- /api/health returns ok
- /api/work returns ok
