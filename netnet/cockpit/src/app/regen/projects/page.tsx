import Link from "next/link";
import RegenProjectsClient from "./regen-projects-client";

export const dynamic = "force-dynamic";

export default function RegenProjectsPage() {
  return (
    <div className="nn-page-stack">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="nn-page-kicker">Regen</div>
          <h1>Project Generator</h1>
          <div className="nn-page-lead">
            Proposal-only. Generates a registry project packet + MRV assumptions. No submission without approval.
          </div>
        </div>
        <Link className="text-sm underline text-white/80 hover:text-white" href="/work">
          Work queue
        </Link>
      </div>
      <RegenProjectsClient />
    </div>
  );
}
