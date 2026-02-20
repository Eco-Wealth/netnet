import RunProgramsClient from "./run-programs-client";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function ProgramsRunPage() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Run Programs"
        subtitle="Generate proposal packets from strategy presets."
        guidance="Select a program and actor, then draft the proposal packet for operator review."
        outputs="Produces: program proposal packet, step plan, and optional work item reference."
      />
      <RunProgramsClient />
    </div>
  );
}
