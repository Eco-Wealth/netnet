import Link from "next/link";

const Card = ({ title, desc, href }: { title: string; desc: string; href: string }) => (
  <Link
    href={href}
    title={`What: ${title}. When: operator debug and navigation. Costs: none by default. Requires: policy for spend-adjacent actions. Output: surface at ${href}.`}
    className="block rounded-[var(--r-md)] border border-[color:var(--border)] bg-[hsl(var(--panel))] p-4 transition hover:bg-[hsl(var(--panel2))]"
  >
    <div className="text-base font-semibold">{title}</div>
    <div className="mt-1 text-sm text-[color:var(--muted)]">{desc}</div>
    <div className="mt-2 text-xs text-[color:var(--muted)]">{href}</div>
  </Link>
);

export default function OpsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Operator Console</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Quick links for demos, debugging, and validation.
          </p>
        </div>
        <div className="text-xs text-[color:var(--muted)]">
          Tip: keep a terminal tab for <code className="rounded border border-[color:var(--border)] bg-[hsl(var(--panel2))] px-2 py-1">curl</code> checks.
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card title="Proof UI" desc="Proof builder + proof object panel" href="/proof" />
        <Card title="Execute UI" desc="Paper execution + plans" href="/execute" />
        <Card title="Retire UI" desc="Bridge-based retirement flow" href="/retire" />
        <Card title="Identity UI" desc="Agent identity surface" href="/identity" />
      </section>

      <h2 className="mt-10 text-lg font-semibold">API surfaces</h2>
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Health" desc="Service heartbeat" href="/api/health" />
        <Card title="Carbon Agent Info" desc='GET /api/agent/carbon?action=info' href="/api/agent/carbon?action=info" />
        <Card title="Trade Agent Info" desc='GET /api/agent/trade?action=info' href="/api/agent/trade?action=info" />
        <Card title="Proof Paid" desc="x402 paywalled check (expected 402 in dev)" href="/api/proof-paid" />
      </section>

      <h2 className="mt-10 text-lg font-semibold">Docs</h2>
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <Card title="Bridge docs" desc="Bridge API notes and endpoints" href="/api/bridge/registry" />
        <Card title="Ops runbook file" desc="Repository doc (open locally)" href="#" />
      </section>

      <p className="mt-8 text-xs text-[color:var(--muted)]">
        Note: “Ops runbook file” is a repo markdown doc: <code>netnet/cockpit/docs/UNIT51_OPS_RUNBOOK.md</code>.
      </p>
    </main>
  );
}
