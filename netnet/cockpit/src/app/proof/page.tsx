import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ProofObjectPanel from "./ProofObjectPanel";

export default function ProofPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Proof & Certificates"
        subtitle="Public credibility anchor for agent and operator work."
        guidance="Use this after retirements, trades, or execution actions to package a verifiable receipt."
        outputs="Produces: proof JSON, short/long proof text, and share-ready certificate artifacts."
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link href="/retire" className="nn-shell-navLink">Retire</Link>
            <Link href="/agents" className="nn-shell-navLink">Agents</Link>
          </div>
        }
      />

      <section className="nn-surface grid gap-2">
        <h2>Why this matters</h2>
        <p className="nn-page-lead">
          Proof receipts are the trust layer. They show what happened, who ran it, and what was produced.
        </p>
      </section>

      <ProofObjectPanel />
    </main>
  );
}
