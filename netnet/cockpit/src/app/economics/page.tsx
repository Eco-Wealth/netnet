import Link from "next/link";

export default function EconomicsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Economics</h1>
        <p className="text-sm text-neutral-500">
          Read-only surfaces for revenue routing. Use the allocation planner to generate an operator-approval packet.
        </p>
      </header>

      <section className="rounded-xl border p-4 space-y-2">
        <div className="text-sm font-medium">Allocation planner</div>
        <div className="text-sm text-neutral-600">
          Endpoint: <code className="rounded bg-neutral-100 px-1">/api/agent/allocate</code>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/proof">Proof</Link>
          <Link className="underline" href="/execute">Execute</Link>
          <Link className="underline" href="/retire">Retire</Link>
        </div>
        <div className="text-xs text-neutral-500">
          Example (curl): POST JSON {"{ action: 'plan', realizedFeesUsd: 25 }"} to receive allocations + nextAction.
        </div>
      </section>
    </main>
  );
}
