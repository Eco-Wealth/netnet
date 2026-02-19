import { PromptBrain } from "../types/brain";
import { RunRecord, ValidationReport, ScoreReport } from "../types/runArtifacts";
import { validateRunRecord } from "../validators/core_run_record_integrity/validateRun";
import { computeStructuralScore } from "../scoring/computeStructuralScore";

export function compareBrains(
  champion: PromptBrain,
  challenger: PromptBrain,
  fixtures: RunRecord[]
): {
  championMeanScore: number;
  challengerMeanScore: number;
  challengerHardFailures: number;
  qualifiesForPromotion: boolean;
} {
  // Compute scores for each fixture for both brains. Since brains do not alter execution at this stage,
  // we reuse the fixture RunRecord for both champion and challenger.

  const championScores: number[] = [];
  const challengerScores: number[] = [];
  let challengerHardFailures = 0;

  for (const fixture of fixtures) {
    // Validate and score for champion
    const champValidation: ValidationReport = validateRunRecord(fixture);
    const champScoreReport: ScoreReport = computeStructuralScore(champValidation);
    championScores.push(champScoreReport.structuralScore);

    // Validate and score for challenger (same fixture)
    const challValidation: ValidationReport = validateRunRecord(fixture);
    const challScoreReport: ScoreReport = computeStructuralScore(challValidation);
    challengerScores.push(challScoreReport.structuralScore);

    if (challScoreReport.hardFail) {
      challengerHardFailures += 1;
    }
  }

  const avg = (arr: number[]) => (arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length));

  const championMeanScore = avg(championScores);
  const challengerMeanScore = avg(challengerScores);

  const qualifiesForPromotion =
    challengerHardFailures <= (challenger.promotionPolicy?.maxHardFailures ?? 0) &&
    challengerMeanScore >= championMeanScore + (challenger.promotionPolicy?.minScoreDelta ?? Infinity) &&
    fixtures.length >= (challenger.promotionPolicy?.requiredFixtures ?? Infinity);

  return {
    championMeanScore,
    challengerMeanScore,
    challengerHardFailures,
    qualifiesForPromotion,
  };
}
