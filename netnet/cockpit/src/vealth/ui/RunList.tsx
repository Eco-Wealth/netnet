import React, { useState, useCallback } from "react";
import RunCard from "./RunCard";
import passingRunRecord from "../runs/core.run_record_integrity/passing_run_v1/runRecord.json";
import failingRunRecord from "../runs/core.run_record_integrity/failing_run_v1/runRecord.json";
import championPointer from "../brain/champion.json";
import PromotionPanel from "./PromotionPanel";
import { validateRunRecord } from "../validators/core_run_record_integrity/validateRun";
import { computeStructuralScore } from "../scoring/computeStructuralScore";
import GitHubControlPanel from "./GitHubControlPanel";
import WorkList from "./WorkList";
import { WorkDashboard, WorkDetailPanel, WorkControls } from "./birdseye";

const runsRaw = [
  { id: "passing_run_v1", runRecord: passingRunRecord },
  { id: "failing_run_v1", runRecord: failingRunRecord },
];

export default function RunList(): JSX.Element {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleRunComplete = useCallback((res: any) => {
    // bump refresh to reload work list after running worker
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: 16 }}>
      <div style={{ marginBottom: 16, fontWeight: 700 }}>
        Current Champion Brain: {championPointer.brainId} {championPointer.version}
      </div>

      {runsRaw.map((r) => {
        const validation = validateRunRecord(r.runRecord as any);
        const score = computeStructuralScore(validation);
        return <RunCard key={r.id} id={r.id} runRecord={r.runRecord as any} scoreReport={score} />;
      })}

      <PromotionPanel />
      <GitHubControlPanel />
      <WorkList />

      <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16 }}>
        <WorkControls onRunComplete={handleRunComplete} />
        <WorkDashboard refreshKey={refreshKey} onSelect={setSelectedJobId} />
        <WorkDetailPanel selectedJobId={selectedJobId} />
      </div>
    </div>
  );
}
