import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import type { ExecutionPlan } from "@/lib/operator/planner";

export type OperatorMessageRole = "system" | "operator" | "assistant" | "skill";

export type MessageEnvelope = {
  id: string;
  role: OperatorMessageRole;
  content: string;
  createdAt: number;
  metadata?: {
    policySnapshot?: object;
    proofId?: string;
    action?: string;
    proposal?: SkillProposalEnvelope;
    plan?: ExecutionPlan;
  };
};

export type OperatorConsoleMode = "READ_ONLY";
