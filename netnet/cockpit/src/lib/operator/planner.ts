import type { ExecutionPlan, SkillProposalEnvelope } from "@/lib/operator/types";

export type { ExecutionPlan } from "@/lib/operator/types";

export function buildExecutionPlan(proposal: SkillProposalEnvelope): ExecutionPlan {
  return {
    proposalId: proposal.id,
    createdAt: Date.now(),
    steps: [
      {
        stepId: `${proposal.id}-step-01`,
        skill: proposal.skillId,
        route: proposal.route,
        payloadPreview: proposal.proposedBody,
        requiresPolicy: true,
      },
    ],
    summary: `Would call POST ${proposal.route} with provided payload.`,
  };
}
