import Link from "next/link";

export default function LaunchPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Token Launch (Propose-only)</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Generates an operator-approved proposal packet for a Bankr token launch. No execution occurs here.
      </p>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">API</div>
            <div className="mt-1 font-mono text-xs text-neutral-400">/api/bankr/launch</div>
          </div>
          <Link
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
            href="/proof"
          >
            Go to Proof
          </Link>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>POST returns: what will happen + estimated costs + requires approval.</li>
          <li>Attach proposal.proofIntent to proof-of-action after execution.</li>
          <li>Fee routing and autonomy are controlled by policy (Units 32/38).</li>
        </ul>
      </div>
    </main>
  );
}
