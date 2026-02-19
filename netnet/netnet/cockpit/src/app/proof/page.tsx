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
    <main className="nn-page-stack">
      <header className="nn-page-header">
        <div className="nn-page-kicker">Proof</div>
        <h1>Proof</h1>
        <p className="nn-page-lead">
        Confirm the x402 paywall is working, and produce receipt-like proof artifacts for humans and agents.
        </p>
      </header>

      <div className="nn-surface">
        <div className="text-sm text-white/80">
          If you already have an existing Proof UI, keep it. This file is a fallback page + adds Proof Objects below.
        </div>
      </div>

      <ProofObjectPanel />
    </main>
  );
}
