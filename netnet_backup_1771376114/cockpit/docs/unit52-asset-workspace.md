# Unit 52 — Asset Workspace

Adds a focused "inner loop" page for binding an asset (token/contract) to scanning, planning, work-queue creation, and read-only agent surfaces.

Route:
- `/assets/[chain]/[address]`

What it does:
- Calls `/api/health` for a quick service check.
- Calls `/api/ecotoken/scan?chain=...&address=...` to generate verification links.
- Calls `/api/agent/trade?action=info` and `/api/agent/carbon?action=info` to show safe-by-default capabilities.
- Attempts to create a proposed work item via `POST /api/work/items` (if present); errors are displayed without breaking the page.

Notes:
- This is a wiring unit: it does not add new execution authority.
- It is designed to be stable even if optional endpoints are missing.
