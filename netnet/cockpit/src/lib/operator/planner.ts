import type { SkillProposalEnvelope } from "@/lib/operator/proposal";

export type PlannedStep = {
  stepId: string;
  skill: string;
  route: string;
  payloadPreview: unknown;
  requiresPolicy: boolean;
};

export type ExecutionPlan = {
  proposalId: string;
  createdAt: number;
  steps: PlannedStep[];
  summary: string;
};

export function isExecutionPlan(value: unknown): value is ExecutionPlan {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.proposalId !== "string" || !v.proposalId.trim()) return false;
  if (typeof v.createdAt !== "number" || !Number.isFinite(v.createdAt)) return false;
  if (!Array.isArray(v.steps)) return false;
  if (typeof v.summary !== "string" || !v.summary.trim()) return false;

  for (const step of v.steps) {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    if (typeof s.stepId !== "string" || !s.stepId.trim()) return false;
    if (typeof s.skill !== "string" || !s.skill.trim()) return false;
    if (typeof s.route !== "string" || !s.route.trim()) return false;
    if (typeof s.requiresPolicy !== "boolean") return false;
  }
  return true;
}

export function buildExecutionPlan(
  proposal: SkillProposalEnvelope
): ExecutionPlan {
  const step: PlannedStep = {
    stepId: `${proposal.id}-step-01`,
    skill: proposal.skillId,
    route: proposal.route,
    payloadPreview: proposal.proposedBody,
    requiresPolicy: true,
  };

  return {
    proposalId: proposal.id,
    createdAt: proposal.createdAt,
    steps: [step],
    summary: `Would call POST ${proposal.route} with provided payload.`,
  };
}
