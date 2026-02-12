import Link from "next/link";

export default function EconomicsPage() {
  return (
    <main className="nn-page-stack">
      <header className="nn-page-header">
        <div className="nn-page-kicker">Economics</div>
        <h1>Economics</h1>
        <p className="nn-page-lead">
          Read-only surfaces for revenue routing. Use the allocation planner to generate an operator-approval packet.
        </p>
      </header>

      <section className="nn-surface space-y-2">
        <h3>Allocation planner</h3>
        <div className="text-sm text-white/75">
          Endpoint: <code className="rounded bg-white/[0.08] px-1">/api/agent/allocate</code>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/proof">Proof</Link>
          <Link className="underline" href="/execute">Execute</Link>
          <Link className="underline" href="/retire">Retire</Link>
        </div>
        <div className="text-xs text-white/65">
          Example (curl): POST JSON {"{ action: 'plan', realizedFeesUsd: 25 }"} to receive allocations + nextAction.
        </div>
      </section>
    </main>
  );
}
