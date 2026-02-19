import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function EconomicsPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Economics"
        subtitle="Review revenue allocation planning inputs and outputs."
        guidance="Use the loop runner for concrete packets, then move approved work into Execute."
        outputs="Produces: allocation proposal packets and proof-ready planning context."
      />

      <section className="nn-surface space-y-2">
        <h3>Allocation Planner</h3>
        <div className="text-sm text-white/75">
          Endpoint: <code className="rounded bg-white/[0.08] px-1">/api/agent/allocate</code>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/proof">Proof</Link>
          <Link className="underline" href="/execute">Execute</Link>
          <Link className="underline" href="/retire">Retire</Link>
        </div>
        <div className="text-xs text-white/65">POST {"{ action: 'plan', realizedFeesUsd: 25 }"} for a plan packet.</div>
      </section>
    </main>
  );
}
