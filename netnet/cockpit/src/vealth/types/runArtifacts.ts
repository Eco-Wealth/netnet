/* Auto-generated canonical artifact contract types for Vealth
 * TypeScript only - no runtime logic
 * Location: netnet/cockpit/src/vealth/types/runArtifacts.ts
 */

export interface RunParameters {
  capabilityId: string;
  brainVersion: string;
  tokenCap: number;
  usdCap: number;
  maxSteps: number;
  model: string;
  temperature: 0;
  seed: number;
  timeoutMs: number;
}

export interface RunRecord {
  runId: string;
  timestamp: string; // ISO 8601
  params: RunParameters;
  tokenUsed: number;
  usdUsed: number;
  steps: number;
  touchedPaths: string[];
}

export interface ValidationInvariantResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ValidationReport {
  schemaValid: boolean;
  invariantResults: ValidationInvariantResult[];
  hardFailures: string[];
  warnings: string[];
}

export interface StructuralScoreComponents {
  schemaValidity: number;
  invariants: number;
  completeness: number;
  determinism: number;
  diffLocality: number;
  uiRenderability: number;
}

export interface ScoreReport {
  structuralScore: number; // 0-100
  components: StructuralScoreComponents;
  hardFail: boolean;
}

export interface ArtifactBundle {
  type: string;
  version: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}
