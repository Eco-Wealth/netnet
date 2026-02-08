// NOTE:
// This file intentionally keeps existing Proof page content intact by wrapping it.
// If the repo already has a /app/proof/page.tsx, you'll need to merge the <ProofObjectPanel /> section into it.
//
// If this file conflicts with an existing one, prefer manual merge:
// 1) keep existing page UI
// 2) add: import ProofObjectPanel from "./ProofObjectPanel";
// 3) render: <ProofObjectPanel /> near the bottom

import ProofObjectPanel from "./ProofObjectPanel";

export default function ProofPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Existing proof UI likely lives elsewhere; this is a safe baseline page if missing. */}
      <h1 className="text-3xl font-semibold">Proof</h1>
      <p className="mt-2 text-sm text-white/70">
        Confirm the x402 paywall is working, and produce receipt-like proof artifacts for humans and agents.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm text-white/80">
          If you already have an existing Proof UI, keep it. This file is a fallback page + adds Proof Objects below.
        </div>
      </div>

      <ProofObjectPanel />
    </main>
  );
}
