import { PromptBrain, PromotionArtifact } from "../types/brain";

export function generatePromotionArtifact(
  champion: PromptBrain,
  challenger: PromptBrain,
  comparisonResult: { championMeanScore: number; challengerMeanScore: number; challengerHardFailures: number; qualifiesForPromotion: boolean }
): PromotionArtifact {
  const approved = comparisonResult.qualifiesForPromotion === true;
  const reason = approved ? "Challenger meets promotion policy." : "Challenger does not satisfy promotion policy.";

  return {
    previousChampionVersion: champion.version,
    newChampionVersion: challenger.version,
    reason,
    championMeanScore: comparisonResult.championMeanScore,
    challengerMeanScore: comparisonResult.challengerMeanScore,
    challengerHardFailures: comparisonResult.challengerHardFailures,
    approved,
  };
}
