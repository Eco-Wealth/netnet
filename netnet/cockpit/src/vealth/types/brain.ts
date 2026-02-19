/* Brain types for Vealth - TypeScript only - no runtime logic */

export interface BrainPromotionPolicy {
  minScoreDelta: number;
  requiredFixtures: number;
  maxHardFailures: number;
}

export interface PromptBrain {
  id: string;
  version: string;
  parentVersion?: string;
  systemRules: string[];
  executionTemplates: Record<string, string>;
  toolBudgets: Record<string, number>;
  artifactContracts: Record<string, unknown>;
  promotionPolicy: BrainPromotionPolicy;
}

export interface ChampionPointer {
  brainId: string;
  version: string;
}

export interface PromotionArtifact {
  previousChampionVersion: string;
  newChampionVersion: string;
  reason: string;
  championMeanScore: number;
  challengerMeanScore: number;
  challengerHardFailures: number;
  approved: boolean;
}
