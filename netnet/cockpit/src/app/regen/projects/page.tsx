import Link from "next/link";
import RegenProjectsClient from "./regen-projects-client";

export const dynamic = "force-dynamic";

export default function RegenProjectsPage() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Regen: Project Generator</div>
          <div className="text-sm opacity-70">
            Proposal-only. Generates a registry project packet + MRV assumptions. No submission without approval.
          </div>
        </div>
        <Link className="text-sm underline opacity-80 hover:opacity-100" href="/work">
          Work queue
        </Link>
      </div>
      <RegenProjectsClient />
    </div>
  );
}
