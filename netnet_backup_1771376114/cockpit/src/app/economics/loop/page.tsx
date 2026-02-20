import EconomicsLoopClient from "./loop-client";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function EconomicsLoopPage() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Economics Loop"
        subtitle="Run a proposal-only revenue to allocation loop."
        guidance="Set window + amount, run the loop, and create a work item if the packet is ready."
        outputs="Produces: revenue report, allocation plan, retire intent, and proof payload."
      />
      <EconomicsLoopClient />
    </div>
  );
}
