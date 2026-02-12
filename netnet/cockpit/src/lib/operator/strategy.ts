export type StrategyKind = "bankr" | "dev" | "ops" | "carbon" | "generic";

export type StrategyStatus = "draft" | "active" | "paused" | "archived";

export type Strategy = {
  id: string;
  title: string;
  kind: StrategyKind;
  status: StrategyStatus;
  linkedProposalId?: string;
  linkedMessageId?: string;
  notes?: string;
  scheduleHint?: string;
  createdAt: number;
  updatedAt: number;
};

export type StrategyInput = Partial<Strategy> & {
  id?: string;
  title?: string;
};

export function normalizeStrategy(input: StrategyInput): Strategy {
  const now = Date.now();
  return {
    id: String(input.id || ""),
    title: String(input.title || "Untitled strategy").trim() || "Untitled strategy",
    kind: input.kind || "generic",
    status: input.status || "draft",
    linkedProposalId: input.linkedProposalId || undefined,
    linkedMessageId: input.linkedMessageId || undefined,
    notes: input.notes || undefined,
    scheduleHint: input.scheduleHint || undefined,
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  };
}
