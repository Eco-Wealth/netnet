import RunProgramsClient from "./run-programs-client";

export const dynamic = "force-dynamic";

export default function ProgramsRunPage() {
  return (
    <div className="nn-page-stack">
      <header className="nn-page-header">
        <div className="nn-page-kicker">Programs</div>
        <h1>Run Programs</h1>
        <p className="nn-page-lead">
          Proposal-first runner for deterministic program packets and work creation.
        </p>
      </header>
      <RunProgramsClient />
    </div>
  );
}
