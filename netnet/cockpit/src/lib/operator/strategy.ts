export type StrategyStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export type Strategy = {
  id: string;
  name: string;
  description: string;
  goals: string[];
  status: StrategyStatus;
  createdAt: number;
  updatedAt: number;
  linkedProposalIds: string[];
};

