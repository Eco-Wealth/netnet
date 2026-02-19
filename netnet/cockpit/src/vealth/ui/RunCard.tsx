import React from "react";
import { RunRecord, ScoreReport } from "../types/runArtifacts";

export type RunCardProps = {
  id: string;
  runRecord: RunRecord;
  scoreReport: ScoreReport;
};

export default function RunCard({ id, runRecord, scoreReport }: RunCardProps) {
  const hard = scoreReport.hardFail === true;
  const borderColor = hard ? "#ff4d4f" : "#52c41a";
  const containerStyle: React.CSSProperties = {
    border: `2px solid ${borderColor}`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };
  const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
  const redText: React.CSSProperties = { color: "#ff4d4f", fontWeight: 600 };
  const greenText: React.CSSProperties = { color: "#237804", fontWeight: 600 };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{id}</div>
        <div>
          <span style={{ marginRight: 8 }}>Score: {scoreReport.structuralScore}</span>
          {scoreReport.hardFail ? <span style={redText}>HARD FAIL</span> : <span style={greenText}>PASS</span>}
        </div>
      </div>

      <div>
        <div>tokenUsed / tokenCap: {runRecord.tokenUsed} / {runRecord.params.tokenCap}</div>
        <div>usdUsed / usdCap: {runRecord.usdUsed} / {runRecord.params.usdCap}</div>
        <div>steps / maxSteps: {runRecord.steps} / {runRecord.params.maxSteps}</div>
      </div>

      <div>
        <div style={{ fontWeight: 600 }}>touchedPaths:</div>
        <ul>
          {runRecord.touchedPaths.map((p) => (
            <li key={p} style={{ fontFamily: "monospace" }}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
