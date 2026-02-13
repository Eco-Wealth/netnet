import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RegenProjectsClient from "./regen-projects-client";

export const dynamic = "force-dynamic";

export default function RegenProjectsPage() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Regen Projects"
        subtitle="Draft proposal-ready project packets with MRV assumptions."
        guidance="Enter core project details, generate the packet, then validate before creating a work item."
        outputs="Produces: regen packet JSON, validation output, and optional work item."
        rightSlot={
          <Link className="text-sm underline text-white/80 hover:text-white" href="/work">
            Work Queue
          </Link>
        }
      />
      <RegenProjectsClient />
    </div>
  );
}
