import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function LaunchPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Execute / Launch"
        subtitle="Token launch planning surface (proposal-only)."
        guidance="Review launch API semantics and move drafted proposals through Operator approvals."
        outputs="Produces: launch proposal packets and proof intent metadata."
      />

      <div className="nn-surface">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">API</div>
            <div className="mt-1 font-mono text-xs text-white/70">/api/bankr/launch</div>
          </div>
          <Link
            className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-sm hover:bg-white/[0.1]"
            href="/proof"
          >
            Go to Proof
          </Link>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/75">
          <li>POST returns: what will happen + estimated costs + requires approval.</li>
          <li>Attach proposal.proofIntent to proof-of-action after execution.</li>
          <li>Fee routing and autonomy are controlled by policy (Units 32/38).</li>
        </ul>
      </div>
    </main>
  );
}
