import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const Card = ({ title, desc, href }: { title: string; desc: string; href: string }) => (
  <Link
    href={href}
    className="block rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
  >
    <div className="text-base font-semibold">{title}</div>
    <div className="mt-1 text-sm text-white/70">{desc}</div>
    <div className="mt-3 text-sm text-white/60">{href}</div>
  </Link>
);

export default function OpsPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Ops"
        subtitle="Quick links for demos, debugging, and validation."
        guidance="Use these links to jump directly to active UI/API surfaces."
        outputs="Produces: direct navigation to key UI tabs and API route checks."
      />

      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Proof UI" desc="Proof builder + proof object panel" href="/proof" />
        <Card title="Execute UI" desc="Paper execution + plans" href="/execute" />
        <Card title="Retire UI" desc="Bridge-based retirement flow" href="/retire" />
        <Card title="Identity UI" desc="Agent identity surface" href="/identity" />
      </section>

      <h2>API Surfaces</h2>
      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Health" desc="Service heartbeat" href="/api/health" />
        <Card title="Carbon Agent Info" desc='GET /api/agent/carbon?action=info' href="/api/agent/carbon?action=info" />
        <Card title="Trade Agent Info" desc='GET /api/agent/trade?action=info' href="/api/agent/trade?action=info" />
        <Card title="Proof Paid" desc="x402 paywalled check (expected 402 in dev)" href="/api/proof-paid" />
      </section>

      <h2>Docs</h2>
      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Bridge docs" desc="Bridge API notes and endpoints" href="/api/bridge/registry" />
        <Card title="Ops runbook file" desc="Repository doc (open locally)" href="#" />
      </section>

      <p className="text-xs text-white/55">
        Note: “Ops runbook file” is a repo markdown doc: <code>netnet/cockpit/docs/UNIT51_OPS_RUNBOOK.md</code>.
      </p>
    </main>
  );
}
