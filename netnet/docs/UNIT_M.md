# Unit M — Proof + Work UX Linkage

Adds:
- `src/lib/work/proofLink.ts` helper to create a work item and attach a proof event.
- Updates `ProofObjectPanel` to:
  - Build proof
  - Create work item from proof (one click)
  - Attach proof to existing work item by id

Assumes canonical Work API:
- POST `/api/work` returns `{ ok: true, id, item }`
- POST `/api/work/[id]` appends an event `{ type, by, note, patch }`
