Unit 6 — Proof Objects (netnet.proof.v1)

What this patch adds:
- /api/proof/build (POST) builds a deterministic proof object given kind/subject/refs/claims.
- lib/proof.ts provides schema types + canonical JSON hashing.
- Proof UI panel for building/copying proof JSON + two post formats.

If /app/proof/page.tsx already exists:
- keep the existing page content
- import ProofObjectPanel from "./ProofObjectPanel"
- render <ProofObjectPanel /> near the bottom
