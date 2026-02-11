import type { SkillProposalEnvelope } from "@/lib/operator/proposal";

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
  };
};

export type OperatorConsoleMode = "READ_ONLY";
