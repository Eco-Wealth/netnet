import { ValidationReport, ScoreReport, StructuralScoreComponents } from "../types/runArtifacts";

export function computeStructuralScore(validation: ValidationReport): ScoreReport {
  // Hard fail override
  if (validation.hardFailures && validation.hardFailures.length > 0) {
    const zeroComponents: StructuralScoreComponents = {
      schemaValidity: 0,
      invariants: 0,
      completeness: 0,
      determinism: 0,
      diffLocality: 0,
      uiRenderability: 0,
    };
    return {
      structuralScore: 0,
      components: zeroComponents,
      hardFail: true,
    };
  }

  // schemaValidity
  const schemaValidity = validation.schemaValid === true ? 1 : 0;

  // invariants: (# passed) / (total)
  let invariantsScore = 0;
  if (Array.isArray(validation.invariantResults) && validation.invariantResults.length > 0) {
    const passed = validation.invariantResults.filter((r) => r.passed === true).length;
    invariantsScore = passed / validation.invariantResults.length;
  } else {
    invariantsScore = 0;
  }

  // completeness
  let completeness = 0;
  if (validation.schemaValid === false) {
    completeness = 0;
  } else if (Array.isArray(validation.warnings) && validation.warnings.length > 0) {
    completeness = 0.5;
  } else {
    completeness = 1;
  }

  // determinism: 1 if no invariant named "determinism" failed
  const determinismFailed = Array.isArray(validation.invariantResults) && validation.invariantResults.some((r) => r.name === "determinism" && r.passed === false);
  const determinism = determinismFailed ? 0 : 1;

  // diffLocality: 1 if no invariant named "touchedPathsPrefix" failed
  const diffLocalityFailed = Array.isArray(validation.invariantResults) && validation.invariantResults.some((r) => r.name === "touchedPathsPrefix" && r.passed === false);
  const diffLocality = diffLocalityFailed ? 0 : 1;

  // uiRenderability: 1 if schemaValid true
  const uiRenderability = validation.schemaValid === true ? 1 : 0;

  const components: StructuralScoreComponents = {
    schemaValidity,
    invariants: invariantsScore,
    completeness,
    determinism,
    diffLocality,
    uiRenderability,
  };

  const rawScore = (schemaValidity + invariantsScore + completeness + determinism + diffLocality + uiRenderability) / 6 * 100;
  const structuralScore = Math.round(rawScore);

  return {
    structuralScore,
    components,
    hardFail: false,
  };
}
