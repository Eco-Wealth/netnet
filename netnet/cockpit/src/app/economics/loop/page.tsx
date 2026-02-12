import EconomicsLoopClient from "./loop-client";

export const dynamic = "force-dynamic";

export default function EconomicsLoopPage() {
  return (
    <div className="nn-page-stack">
      <header className="nn-page-header">
        <div className="nn-page-kicker">Economics</div>
        <h1>Economics Loop</h1>
        <div className="nn-page-lead">
          Revenue → Allocation → Retire intent. Proposal-only outputs with proof + optional work item.
        </div>
      </header>
      <EconomicsLoopClient />
    </div>
  );
}
