import { RunRecord, ValidationReport, ValidationInvariantResult } from "../../types/runArtifacts";

export function validateRunRecord(run: RunRecord): ValidationReport {
  const hardFailures: string[] = [];
  const warnings: string[] = [];
  const invariantResults: ValidationInvariantResult[] = [];

  // Schema validity: check required top-level fields exist
  let schemaValid = true;
  const requiredTopLevel = ["runId", "timestamp", "params", "tokenUsed", "usdUsed", "steps", "touchedPaths"];
  for (const key of requiredTopLevel) {
    if (Object.prototype.hasOwnProperty.call(run, key) === false) {
      schemaValid = false;
      hardFailures.push(`Missing required field: ${key}`);
    }
  }

  // Invariant A: touchedPathsPrefix
  const touchedPathsPrefixName = "touchedPathsPrefix";
  let touchedPathsPrefixPassed = true;
  if (!Array.isArray(run.touchedPaths)) {
    touchedPathsPrefixPassed = false;
    hardFailures.push("touchedPaths is not an array");
  } else {
    for (const p of run.touchedPaths) {
      if (typeof p !== "string" || !p.startsWith("netnet/cockpit/src/")) {
        touchedPathsPrefixPassed = false;
        hardFailures.push(`touchedPath violates prefix rule: ${String(p)}`);
      }
    }
  }
  invariantResults.push({
    name: touchedPathsPrefixName,
    passed: touchedPathsPrefixPassed,
    message: touchedPathsPrefixPassed ? undefined : "One or more touchedPaths do not start with required prefix",
  });

  // Invariant B: Token cap enforcement
  const tokenCapName = "tokenCapEnforcement";
  const tokenCapPassed = typeof run.tokenUsed === "number" && typeof run.params?.tokenCap === "number" && run.tokenUsed <= run.params.tokenCap;
  if (!tokenCapPassed) {
    hardFailures.push(`tokenUsed exceeds tokenCap: ${String(run.tokenUsed)} > ${String(run.params?.tokenCap)}`);
  }
  invariantResults.push({
    name: tokenCapName,
    passed: tokenCapPassed,
    message: tokenCapPassed ? undefined : "tokenUsed exceeds tokenCap",
  });

  // Invariant C: USD cap enforcement
  const usdCapName = "usdCapEnforcement";
  const usdCapPassed = typeof run.usdUsed === "number" && typeof run.params?.usdCap === "number" && run.usdUsed <= run.params.usdCap;
  if (!usdCapPassed) {
    hardFailures.push(`usdUsed exceeds usdCap: ${String(run.usdUsed)} > ${String(run.params?.usdCap)}`);
  }
  invariantResults.push({
    name: usdCapName,
    passed: usdCapPassed,
    message: usdCapPassed ? undefined : "usdUsed exceeds usdCap",
  });

  // Invariant D: Step limit
  const stepLimitName = "stepLimit";
  const stepLimitPassed = typeof run.steps === "number" && typeof run.params?.maxSteps === "number" && run.steps <= run.params.maxSteps;
  if (!stepLimitPassed) {
    hardFailures.push(`steps exceeds maxSteps: ${String(run.steps)} > ${String(run.params?.maxSteps)}`);
  }
  invariantResults.push({
    name: stepLimitName,
    passed: stepLimitPassed,
    message: stepLimitPassed ? undefined : "steps exceeds maxSteps",
  });

  // Invariant E: Determinism (temperature === 0)
  const determinismName = "determinism";
  const determinismPassed = run.params && run.params.temperature === 0;
  if (!determinismPassed) {
    hardFailures.push(`temperature is not 0: ${String(run.params?.temperature)}`);
  }
  invariantResults.push({
    name: determinismName,
    passed: determinismPassed,
    message: determinismPassed ? undefined : "params.temperature must be 0",
  });

  // If schema validity false, ensure hardFailures contains schema issue(s) (already pushed above)

  return {
    schemaValid,
    invariantResults,
    hardFailures,
    warnings,
  };
}
