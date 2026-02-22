export type StrategyKind = "bankr" | "dev" | "ops" | "carbon" | "generic";

export type StrategyStatus = "draft" | "active" | "paused" | "archived";

export type StrategyType = "standard" | "bankrOps";

export type BankrStrategyAction =
  | "bankr.wallet.read"
  | "bankr.token.info"
  | "bankr.token.actions"
  | "bankr.launch";

export type BankrStrategyBinding = {
  action: BankrStrategyAction;
  params?: Record<string, unknown>;
};

export type Strategy = {
  id: string;
  title: string;
  kind: StrategyKind;
  type: StrategyType;
  status: StrategyStatus;
  bankr?: BankrStrategyBinding;
  linkedProposalId?: string;
  linkedMessageId?: string;
  notes?: string;
  scheduleHint?: string;
  runbookMarkdown?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type StrategyInput = Partial<Strategy> & {
  id?: string;
  title?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isBankrStrategyAction(value: string): value is BankrStrategyAction {
  return (
    value === "bankr.wallet.read" ||
    value === "bankr.token.info" ||
    value === "bankr.token.actions" ||
    value === "bankr.launch"
  );
}

function normalizeBankrBinding(input: StrategyInput): BankrStrategyBinding | undefined {
  const raw = input.bankr;
  if (!raw || typeof raw !== "object") return undefined;
  const action = typeof raw.action === "string" ? raw.action.trim() : "";
  if (!isBankrStrategyAction(action)) return undefined;
  const params = isRecord(raw.params) ? raw.params : undefined;
  return params ? { action, params } : { action };
}

export function normalizeStrategy(input: StrategyInput): Strategy {
  const now = Date.now();
  const bankr = normalizeBankrBinding(input);
  const type = input.type || (bankr ? "bankrOps" : "standard");
  return {
    id: String(input.id || ""),
    title: String(input.title || "Untitled strategy").trim() || "Untitled strategy",
    kind: input.kind || "generic",
    type,
    status: input.status || "draft",
    bankr: type === "bankrOps" ? bankr : undefined,
    linkedProposalId: input.linkedProposalId || undefined,
    linkedMessageId: input.linkedMessageId || undefined,
    notes: input.notes || undefined,
    scheduleHint: input.scheduleHint || undefined,
    runbookMarkdown: input.runbookMarkdown || undefined,
    pinned: typeof input.pinned === "boolean" ? input.pinned : false,
    createdAt: typeof input.createdAt === "number" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : now,
  };
}
