export type MessageRole = "system" | "operator" | "assistant" | "skill";

export type ProposalStatus = "draft" | "approved" | "rejected";
export type ExecutionIntentStatus = "none" | "requested" | "locked";
export type ExecutionStatus = "idle" | "running" | "completed" | "failed";

export type PlannedStep = {
  stepId: string;
  skill: string;
  action: string;
  method: "GET" | "POST";
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

export type ExecutionResultEnvelope = {
  ok: boolean;
  route: string;
  policyDecision: string;
  timestamp: number;
  result?: Record<string, unknown>;
  error?: string;
};

export type SkillProposalEnvelope = {
  id: string;
  type: "skill.proposal";
  skillId: string;
  route: string;
  reasoning: string;
  proposedBody: Record<string, unknown>;
  metadata?: {
    confirmedWrite?: boolean;
    [key: string]: unknown;
  };
  riskLevel: "low" | "medium" | "high";
  status: ProposalStatus;
  createdAt: number;
  approvedAt?: number;
  executionIntent: ExecutionIntentStatus;
  executionRequestedAt?: number;
  executionStatus: ExecutionStatus;
  executionStartedAt?: number;
  executionCompletedAt?: number;
  executionPlan?: ExecutionPlan;
  executionResult?: ExecutionResultEnvelope;
  executionError?: string;
};

export type MessageMetadata = {
  policySnapshot?: Record<string, unknown>;
  proofId?: string;
  action?: string;
  proposalId?: string;
  proposal?: SkillProposalEnvelope;
  source?: string;
  chatId?: string;
  mode?: string;
  rawAssistantContent?: string;
  tags?: string[];
  plan?: ExecutionPlan;
  executionResult?: ExecutionResultEnvelope;
};

export type MessageEnvelope = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  metadata?: MessageMetadata;
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_SEQ__: number | undefined;
}

export function createMessageId(prefix = "msg"): string {
  const next = (globalThis.__NETNET_OPERATOR_SEQ__ ?? 0) + 1;
  globalThis.__NETNET_OPERATOR_SEQ__ = next;
  return `${prefix}_${next.toString().padStart(6, "0")}`;
}
