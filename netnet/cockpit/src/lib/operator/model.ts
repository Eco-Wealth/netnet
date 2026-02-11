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
  };
};

export type OperatorConsoleMode = "READ_ONLY";
