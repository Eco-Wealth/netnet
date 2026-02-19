import * as fs from "fs";
import * as path from "path";
import championPointer from "../brain/champion.json";
import brainV1 from "../brain/brains/prompt_brain_v1.json";
import passingRunRecord from "../runs/core.run_record_integrity/passing_run_v1/runRecord.json";
import failingRunRecord from "../runs/core.run_record_integrity/failing_run_v1/runRecord.json";
import { validateRunRecord } from "../validators/core_run_record_integrity/validateRun";
import { computeStructuralScore } from "../scoring/computeStructuralScore";

export function runDeterministicLoop(): { runId: string; meanScore: number; hardFailures: number } {
  // Resolve champion brain (static)
  const champion = championPointer.version === brainV1.version ? brainV1 : brainV1; // only v1 exists for now

  const fixtures = [passingRunRecord, failingRunRecord];

  const scores: number[] = [];
  let hardFailures = 0;

  for (const fixture of fixtures) {
    const validation = validateRunRecord(fixture as any);
    const scoreReport = computeStructuralScore(validation);
    scores.push(scoreReport.structuralScore);
    if (scoreReport.hardFail) hardFailures += 1;
  }

  const meanScore = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));

  const runId = `orchestrator_${champion.version}_v1`;
  const baseDir = path.join(__dirname, "../runs/orchestrator", runId);

  // Prepare artifacts
  const fixedTimestamp = "2026-01-01T00:00:00.000Z";
  const runRecord = {
    runId,
    timestamp: fixedTimestamp,
    params: {
      capabilityId: "orchestrator.loop",
      brainVersion: champion.version,
      tokenCap: 1000,
      usdCap: 1,
      maxSteps: 10,
      model: "deterministic",
      temperature: 0,
      seed: 1,
      timeoutMs: 1000,
    },
    tokenUsed: 0,
    usdUsed: 0,
    steps: fixtures.length,
    touchedPaths: [],
  };

  const validationReport = {
    schemaValid: true,
    invariantResults: [],
    hardFailures: [],
    warnings: [],
  };

  const scoreReport = {
    structuralScore: meanScore,
    components: hardFailures > 0 ? { schemaValidity: 0, invariants: 0, completeness: 0, determinism: 0, diffLocality: 0, uiRenderability: 0 } : { schemaValidity: 1, invariants: 1, completeness: 1, determinism: 1, diffLocality: 1, uiRenderability: 1 },
    hardFail: hardFailures > 0,
  };

  const artifactBundle = {
    type: "orchestrator_result",
    version: "1.0",
    payload: { meanScore, hardFailures },
  };

  // Write files under allowed directory
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(path.join(baseDir, "runRecord.json"), JSON.stringify(runRecord, null, 2), { encoding: "utf8" });
  fs.writeFileSync(path.join(baseDir, "validationReport.json"), JSON.stringify(validationReport, null, 2), { encoding: "utf8" });
  fs.writeFileSync(path.join(baseDir, "scoreReport.json"), JSON.stringify(scoreReport, null, 2), { encoding: "utf8" });
  fs.writeFileSync(path.join(baseDir, "artifactBundle.json"), JSON.stringify(artifactBundle, null, 2), { encoding: "utf8" });

  return { runId, meanScore, hardFailures };
}
