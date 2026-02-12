export type AutonomyLevel =
  | "READ_ONLY"
  | "PROPOSE_ONLY"
  | "EXECUTE_WITH_LIMITS"
  | "AUTONOMOUS_PROGRAMS";

export type DecisionMode = "BLOCK" | "ALLOW" | "REQUIRE_APPROVAL";

export type ProgramId =
  | "TRADING_LOOP"
  | "TOKEN_OPS"
  | "MICRO_RETIRE"
  | "SDG_WORK"
  | "RESTAURANT_OPS";

export type PolicyAction =
  | "trade.quote"
  | "trade.plan"
  | "trade.execute"
  | "token.launch"
  | "token.manage"
  | "fees.route"
  | "retire.quote"
  | "retire.execute"
  | "proof.build"
  | "work.create"
  | "work.update";

export type Budget = {
  usdPerDay: number;
  usdPerRun: number;
  txPerDay: number;
  inferenceUsdPerDay: number;
  microRetireUsdPerDay: number;
};

export type AllowLists = {
  chains: string[];
  tokens: string[];
  venues: string[];
  actions: PolicyAction[];
};

export type AnomalyTriggers = {
  maxFailuresInWindow: number;
  windowSeconds: number;
  maxSlippageBps: number;
  maxGasUsd: number;
  maxRetries: number;
};

export type ProgramPolicy = {
  id: ProgramId;
  name: string;
  autonomy: AutonomyLevel;
  budgets: Budget;
  allow: AllowLists;
  anomalies: AnomalyTriggers;
};

export type PolicyConfig = {
  version: string;
  updatedAt: string;
  programs: Record<ProgramId, ProgramPolicy>;
};

export type Decision = {
  allowed: boolean;
  mode: DecisionMode;
  reasons: string[];
  limitsApplied: Record<string, any>;
  nextAction?: string;
  correlationId: string;
  programId: ProgramId;
  action: PolicyAction;
};

export type DecideInput = {
  programId: ProgramId;
  action: PolicyAction;
  chain?: string;
  token?: string;
  venue?: string;
  spendUsd?: number;
  slippageBps?: number;
  gasUsd?: number;
  inferenceUsdEstimate?: number;
  retries?: number;
  metadata?: Record<string, any>;
};

export type ProgramStatus = {
  programId: ProgramId;
  paused: boolean;
  pausedUntil?: string;
  lastAnomaly?: { at: string; reason: string };
  recentFailures: number;
};
