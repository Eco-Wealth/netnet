export type OperatorMessageRole = "system" | "operator" | "assistant" | "skill";

export type OperatorMessage = {
  id: string;
  role: OperatorMessageRole;
  content: string;
  createdAt: string;
  skill?: string;
};

export type OperatorConsoleMode = "READ_ONLY";

