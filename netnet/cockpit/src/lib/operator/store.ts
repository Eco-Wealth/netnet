import { BankrLaunchRequest, createLaunchProposal } from "@/lib/bankr/launcher";
import { tokenActionCatalog } from "@/lib/bankr/token";
import { GET as bankrTokenInfoGet } from "@/app/api/bankr/token/info/route";
import { POST as bankrTokenActionsPost } from "@/app/api/bankr/token/actions/route";
import { GET as bankrWalletGet } from "@/app/api/bankr/wallet/route";
import {
  getPnlSummary as loadPnlSummary,
  insertPnlEvent,
  type PnlSummary,
} from "@/lib/operator/db";
import { getPolicy } from "@/lib/policy/store";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { PolicyAction } from "@/lib/policy/types";
import { buildActionProof } from "@/lib/proof/action";
import { buildExecutionPlan } from "@/lib/operator/planner";
import {
  assertBankrExecutable,
  getBankrExecutionTarget,
  isBankrProposal,
} from "@/lib/operator/adapters/bankr";
import {
  isBankrStrategyAction,
  normalizeStrategy,
  type BankrStrategyBinding,
  type Strategy,
  type StrategyInput,
  type StrategyStatus,
} from "@/lib/operator/strategy";
import type {
  ExecutionResultEnvelope,
  MessageEnvelope,
  MessageMetadata,
  SkillProposalEnvelope,
} from "@/lib/operator/types";
import { createMessageId } from "@/lib/operator/types";

type OperatorState = {
  messages: MessageEnvelope[];
  proposals: Record<string, SkillProposalEnvelope>;
  strategies: Record<string, Strategy>;
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_STATE__: OperatorState | undefined;
}

function policySnapshot(): Record<string, unknown> {
  const policy = getPolicy();
  return {
    autonomy: policy.autonomy,
    maxUsdPerDay: policy.maxUsdPerDay,
    maxUsdPerAction: policy.maxUsdPerAction,
    kill: policy.kill,
    updatedAt: policy.updatedAt,
    updatedBy: policy.updatedBy,
  };
}

function getState(): OperatorState {
  if (!globalThis.__NETNET_OPERATOR_STATE__) {
    globalThis.__NETNET_OPERATOR_STATE__ = {
      messages: [
        {
          id: createMessageId("msg"),
          role: "system",
          content:
            "Operator Seat initialized. Default safety posture is proposal-first and policy-gated.",
          createdAt: Date.now(),
          metadata: {
            action: "init",
            tags: ["operator-seat", "safe-defaults"],
            policySnapshot: policySnapshot(),
          },
        },
      ],
      proposals: {},
      strategies: {},
    };
  }
  return globalThis.__NETNET_OPERATOR_STATE__;
}

export function listMessages(): MessageEnvelope[] {
  return [...getState().messages].sort((a, b) => a.createdAt - b.createdAt);
}

export function listProposals(): SkillProposalEnvelope[] {
  return Object.values(getState().proposals).sort((a, b) => b.createdAt - a.createdAt);
}

export function getProposal(id: string): SkillProposalEnvelope | null {
  return getState().proposals[id] || null;
}

export function listStrategies(): Strategy[] {
  return Object.values(getState().strategies).sort((a, b) => b.updatedAt - a.updatedAt);
}

export type OperatorPnLSummary = {
  last24h: PnlSummary;
  last7d: PnlSummary;
};

export function getPnLSummary(now = Date.now()): OperatorPnLSummary {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;
  return {
    last24h: loadPnlSummary({ sinceMs: now - oneDayMs }),
    last7d: loadPnlSummary({ sinceMs: now - sevenDaysMs }),
  };
}

export function getStrategy(id: string): Strategy | null {
  return getState().strategies[id] || null;
}

function requireStrategy(id: string): Strategy {
  const strategy = getStrategy(id);
  if (!strategy) throw new Error(`Strategy not found: ${id}`);
  return strategy;
}

export function createStrategy(input: StrategyInput): Strategy {
  const now = Date.now();
  const strategy = normalizeStrategy({
    ...input,
    id: input.id || createMessageId("strategy"),
    updatedAt: now,
    createdAt: input.createdAt ?? now,
  });
  getState().strategies[strategy.id] = strategy;
  return strategy;
}

export type CreateBankrStrategyDraftInput = {
  title?: string;
  notes?: string;
  linkedMessageId?: string;
  bankr?: {
    action?: string;
    params?: Record<string, unknown>;
  };
};

export type UpdateBankrStrategyDraftPatch = {
  title?: string;
  notes?: string;
  bankr?: {
    action?: string;
    params?: Record<string, unknown>;
  };
};

function normalizeBankrDraftBinding(input?: {
  action?: string;
  params?: Record<string, unknown>;
}): BankrStrategyBinding | undefined {
  if (!input) return undefined;
  const action = String(input.action || "").trim();
  if (!isBankrStrategyAction(action)) return undefined;
  if (
    input.params &&
    typeof input.params === "object" &&
    !Array.isArray(input.params)
  ) {
    return { action, params: input.params };
  }
  return { action };
}

export function createBankrStrategyDraft(
  input: CreateBankrStrategyDraftInput
): Strategy {
  const now = Date.now();
  const bankr = normalizeBankrDraftBinding(input.bankr);
  const strategy = createStrategy({
    id: createMessageId("strategy"),
    title: input.title || "Bankr ops draft",
    kind: "bankr",
    type: "bankrOps",
    status: "draft",
    notes: input.notes,
    linkedMessageId: input.linkedMessageId,
    bankr,
    createdAt: now,
    updatedAt: now,
  });
  return strategy;
}

export function updateBankrStrategyDraft(
  id: string,
  patch: UpdateBankrStrategyDraftPatch
): Strategy {
  const strategy = requireStrategy(id);
  if (strategy.type !== "bankrOps") {
    throw new Error("Only bankrOps strategies can be updated with this method.");
  }

  if (typeof patch.title === "string") {
    strategy.title = patch.title.trim() || strategy.title;
  }
  if (typeof patch.notes === "string") {
    strategy.notes = patch.notes.trim() || undefined;
  }
  if (patch.bankr) {
    const nextBankr = normalizeBankrDraftBinding(patch.bankr);
    if (nextBankr) strategy.bankr = nextBankr;
  }

  strategy.updatedAt = Date.now();
  return strategy;
}

export function updateStrategyStatus(id: string, status: StrategyStatus): Strategy {
  const strategy = requireStrategy(id);
  strategy.status = status;
  strategy.updatedAt = Date.now();
  return strategy;
}

export function linkProposalToStrategy(strategyId: string, proposalId: string): Strategy {
  const strategy = requireStrategy(strategyId);
  strategy.linkedProposalId = proposalId;
  strategy.updatedAt = Date.now();
  return strategy;
}

export function appendMessage(input: {
  role: MessageEnvelope["role"];
  content: string;
  metadata?: MessageMetadata;
}): MessageEnvelope {
  const message: MessageEnvelope = {
    id: createMessageId("msg"),
    role: input.role,
    content: input.content,
    createdAt: Date.now(),
    metadata: input.metadata,
  };
  getState().messages.push(message);
  return message;
}

export function appendAuditMessage(content: string, action: string, role: MessageEnvelope["role"] = "assistant") {
  return appendMessage({
    role,
    content,
    metadata: {
      action,
      tags: ["audit"],
      policySnapshot: policySnapshot(),
    },
  });
}

export function upsertProposal(proposal: SkillProposalEnvelope): SkillProposalEnvelope {
  getState().proposals[proposal.id] = proposal;
  return proposal;
}

function strategyNameForProposal(proposal: SkillProposalEnvelope): string {
  return `Strategy: ${proposal.skillId}`;
}

function strategyKindForProposal(proposal: SkillProposalEnvelope): Strategy["kind"] {
  if (proposal.route.startsWith("/api/bankr")) return "bankr";
  if (proposal.route.includes("retire") || proposal.route.includes("carbon")) return "carbon";
  if (proposal.route.includes("work") || proposal.route.includes("proof")) return "ops";
  return "generic";
}

export function ensureStrategyForProposal(proposal: SkillProposalEnvelope): Strategy {
  const state = getState();
  const existing = Object.values(state.strategies).find(
    (strategy) =>
      strategy.linkedProposalId === proposal.id ||
      (strategy.title === strategyNameForProposal(proposal) &&
        strategy.status !== "archived")
  );

  const nextStatus: StrategyStatus =
    proposal.status === "approved"
      ? "active"
      : proposal.executionStatus === "completed"
      ? "archived"
      : proposal.status === "rejected"
      ? "paused"
      : "draft";

  if (existing) {
    existing.linkedProposalId = proposal.id;
    existing.updatedAt = Date.now();
    existing.status = nextStatus;
    if (!existing.notes && proposal.reasoning.trim()) {
      existing.notes = proposal.reasoning.trim();
    }
    return existing;
  }

  const created = createStrategy({
    title: strategyNameForProposal(proposal),
    kind: strategyKindForProposal(proposal),
    linkedProposalId: proposal.id,
    notes: proposal.reasoning.trim() || `Operator-owned strategy for ${proposal.skillId}.`,
    status: nextStatus,
  });
  created.updatedAt = Date.now();
  return created;
}

function requireProposal(id: string): SkillProposalEnvelope {
  const proposal = getProposal(id);
  if (!proposal) throw new Error(`Proposal not found: ${id}`);
  return proposal;
}

export function approveProposal(id: string): SkillProposalEnvelope {
  const proposal = requireProposal(id);
  proposal.status = "approved";
  proposal.approvedAt = Date.now();
  ensureStrategyForProposal(proposal);
  return proposal;
}

export function rejectProposal(id: string): SkillProposalEnvelope {
  const proposal = requireProposal(id);
  proposal.status = "rejected";
  ensureStrategyForProposal(proposal);
  return proposal;
}

export function requestExecutionIntent(id: string): SkillProposalEnvelope {
  const proposal = requireProposal(id);
  if (proposal.status !== "approved") {
    throw new Error("Only approved proposals can request execution intent.");
  }
  proposal.executionIntent = "requested";
  proposal.executionRequestedAt = Date.now();
  return proposal;
}

export function lockExecutionIntent(id: string): SkillProposalEnvelope {
  const proposal = requireProposal(id);
  if (proposal.executionIntent !== "requested") {
    throw new Error("Execution intent must be requested before it can be locked.");
  }
  proposal.executionIntent = "locked";
  return proposal;
}

export function generateExecutionPlan(id: string): SkillProposalEnvelope {
  const proposal = requireProposal(id);
  if (proposal.executionIntent !== "locked") {
    throw new Error("Execution intent must be locked before generating a plan.");
  }
  proposal.executionPlan = buildExecutionPlan(proposal);
  return proposal;
}

function canExecuteRoute(route: string): boolean {
  return [
    "/api/agent/trade",
    "/api/bankr/token/actions",
    "/api/bankr/token/info",
    "/api/bankr/wallet",
    "/api/bankr/launch",
    "/api/agent/regen/projects",
  ].includes(route);
}

function routeKillSwitchBlocked(route: string): boolean {
  const policy = getPolicy();
  if (policy.kill.all) return true;
  if (route.startsWith("/api/agent/trade")) return policy.kill.trading;
  if (route.startsWith("/api/bankr")) return policy.kill.tokenOps;
  if (route.startsWith("/api/bridge/retire")) return policy.kill.retirements;
  return false;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

const BANKR_READ_ACTIONS = new Set<string>([
  "bankr.wallet.read",
  "bankr.token.info",
  "bankr.token.actions",
  "bankr.quote",
  "bankr.token.read",
  "bankr.plan",
  "bankr.token.actions.plan",
  "token.manage",
]);

const BANKR_WRITE_ACTIONS = new Set<string>(["bankr.launch", "token.launch"]);

function isWriteAction(action: string): boolean {
  if (BANKR_READ_ACTIONS.has(action)) return false;
  if (BANKR_WRITE_ACTIONS.has(action)) return true;
  return true;
}

function assertWriteConfirmation(
  proposal: SkillProposalEnvelope,
  action: string
): void {
  if (!proposal.route.startsWith("/api/bankr")) return;
  if (!isWriteAction(action)) return;
  if (proposal.metadata?.confirmedWrite === true) return;
  throw new Error(
    `Execution blocked: ${action} requires metadata.confirmedWrite=true.`
  );
}

function policyActionForExecution(proposal: SkillProposalEnvelope): PolicyAction {
  if (isBankrProposal(proposal)) {
    const target = getBankrExecutionTarget({ proposal });
    return target.actionId;
  }
  if (proposal.route === "/api/agent/trade") return "trade.plan";
  if (proposal.route === "/api/bankr/launch") return "bankr.launch";
  if (proposal.route === "/api/bankr/token/actions") return "bankr.token.actions";
  if (proposal.route === "/api/agent/regen/projects") return "work.create";
  return "work.update";
}

function policyContextForExecution(
  proposal: SkillProposalEnvelope,
  action: string,
  policyMode?: string
) {
  const body = toRecord(proposal.proposedBody);
  const metadata = toRecord(proposal.metadata);
  const snapshot = toRecord(metadata.policySnapshot);
  const resolvedPolicyMode =
    typeof policyMode === "string"
      ? policyMode
      : typeof metadata.policyMode === "string"
      ? metadata.policyMode
      : typeof snapshot.autonomy === "string"
      ? snapshot.autonomy
      : undefined;
  const amountUsd =
    typeof body.amountUsd === "number"
      ? body.amountUsd
      : typeof body.amount === "number"
      ? body.amount
      : undefined;
  const fromToken =
    typeof body.from === "string"
      ? body.from
      : typeof body.token === "string"
      ? body.token
      : undefined;
  const toToken =
    typeof body.to === "string"
      ? body.to
      : typeof body.symbol === "string"
      ? body.symbol
      : undefined;

  return {
    proposalId: proposal.id,
    action,
    route: proposal.route,
    policyMode: resolvedPolicyMode,
    operatorId:
      typeof metadata.operatorId === "string" ? metadata.operatorId : undefined,
    operatorRole:
      typeof metadata.operatorRole === "string"
        ? metadata.operatorRole
        : undefined,
    chain: typeof body.chain === "string" ? body.chain : undefined,
    venue: proposal.route.startsWith("/api/bankr") ? "bankr" : undefined,
    fromToken,
    toToken,
    amountUsd,
  };
}

async function parseRouteResponse(res: Response): Promise<Record<string, unknown>> {
  try {
    const json = (await res.json()) as Record<string, unknown>;
    return { statusCode: res.status, body: json };
  } catch {
    const text = await res.text().catch(() => "");
    return { statusCode: res.status, body: { raw: text } };
  }
}

async function runBankrRouteExecution(
  proposal: SkillProposalEnvelope
): Promise<Record<string, unknown>> {
  assertBankrExecutable(proposal);
  const target = getBankrExecutionTarget({ proposal });

  if (target.route === "/api/bankr/token/actions") {
    const params = { ...toRecord(proposal.proposedBody) };
    delete params.action;
    const req = new Request(`http://internal${target.route}`, {
      method: target.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "status",
        params: { ...params, bankrActionId: target.actionId },
      }),
    });
    const res = await bankrTokenActionsPost(req);
    const routeResult = await parseRouteResponse(res);
    if (!res.ok) {
      throw new Error(`bankr_route_execution_failed_${res.status}`);
    }
    return {
      adapter: "bankr",
      actionId: target.actionId,
      ...routeResult,
    };
  }

  if (target.route === "/api/bankr/launch") {
    const parsed = BankrLaunchRequest.safeParse({
      name: proposal.proposedBody.name || "Draft Token",
      symbol: proposal.proposedBody.symbol || "DRAFT",
      chain: proposal.proposedBody.chain || "base",
      initialLiquidityUsd:
        typeof proposal.proposedBody.initialLiquidityUsd === "number"
          ? proposal.proposedBody.initialLiquidityUsd
          : undefined,
      notes:
        typeof proposal.proposedBody.notes === "string"
          ? proposal.proposedBody.notes
          : "Generated from Operator Seat execution.",
      operator: {
        id: "operator",
        reason: "Approved from Operator Seat",
      },
    });

    if (!parsed.success) {
      throw new Error("Bankr launch payload is invalid for proposal generation.");
    }

    return {
      adapter: "bankr",
      actionId: target.actionId,
      mode: "PROPOSE_ONLY",
      proposal: createLaunchProposal(parsed.data),
    };
  }

  if (target.route === "/api/bankr/wallet") {
    const body = toRecord(proposal.proposedBody);
    const wallet =
      typeof body.wallet === "string" && body.wallet.trim()
        ? `&wallet=${encodeURIComponent(body.wallet.trim())}`
        : "";
    const req = new Request(
      `http://internal${target.route}?action=state${wallet}`,
      { method: target.method }
    );
    const res = await bankrWalletGet(req);
    const routeResult = await parseRouteResponse(res);
    if (!res.ok) {
      throw new Error(`bankr_route_execution_failed_${res.status}`);
    }
    return {
      adapter: "bankr",
      actionId: target.actionId,
      ...routeResult,
    };
  }

  if (target.route === "/api/bankr/token/info") {
    const body = toRecord(proposal.proposedBody);
    const chain = encodeURIComponent(String(body.chain || "base"));
    const token = encodeURIComponent(String(body.token || "USDC"));
    const req = new Request(
      `http://internal${target.route}?chain=${chain}&token=${token}`,
      { method: target.method }
    );
    const res = await (
      bankrTokenInfoGet as unknown as (request?: Request) => Promise<Response>
    )(req);
    const routeResult = await parseRouteResponse(res);
    if (!res.ok) {
      throw new Error(`bankr_route_execution_failed_${res.status}`);
    }
    return {
      adapter: "bankr",
      actionId: target.actionId,
      ...routeResult,
    };
  }

  throw new Error(`Unsupported Bankr route: ${target.route}`);
}

async function runRouteExecution(
  proposal: SkillProposalEnvelope
): Promise<Record<string, unknown>> {
  if (isBankrProposal(proposal)) {
    return runBankrRouteExecution(proposal);
  }

  if (proposal.route === "/api/agent/trade") {
    return {
      mode: "SIMULATED",
      note: "Trade connector in this snapshot is a safe stub; returning dry-run execution details.",
      payload: proposal.proposedBody,
    };
  }

  if (proposal.route === "/api/bankr/token/actions") {
    const catalog = tokenActionCatalog();
    const action = String(proposal.proposedBody.action || "status");
    const params = (proposal.proposedBody.params || {}) as Record<string, unknown>;
    const def = catalog.find((entry) => entry.action === action) || catalog[0];
    const plan = {
      action: def.action,
      params,
      whatWillHappen: def.whatWillHappen(params),
      estimatedCosts: def.estimatedCosts(params),
      requiresApproval: true,
      safety: def.safety,
      createdAt: new Date().toISOString(),
    };
    return {
      mode: "PROPOSE_ONLY",
      plan,
      proof: buildActionProof({ kind: "bankr.token", plan }),
    };
  }

  if (proposal.route === "/api/bankr/launch") {
    const parsed = BankrLaunchRequest.safeParse({
      name: proposal.proposedBody.name || "Draft Token",
      symbol: proposal.proposedBody.symbol || "DRAFT",
      chain: proposal.proposedBody.chain || "base",
      initialLiquidityUsd:
        typeof proposal.proposedBody.initialLiquidityUsd === "number"
          ? proposal.proposedBody.initialLiquidityUsd
          : undefined,
      notes:
        typeof proposal.proposedBody.notes === "string"
          ? proposal.proposedBody.notes
          : "Generated from Operator Seat execution.",
      operator: {
        id: "operator",
        reason: "Approved from Operator Seat",
      },
    });

    if (!parsed.success) {
      throw new Error("Bankr launch payload is invalid for proposal generation.");
    }

    return {
      mode: "PROPOSE_ONLY",
      proposal: createLaunchProposal(parsed.data),
    };
  }

  if (proposal.route === "/api/agent/regen/projects") {
    const { buildRegenProjectPacket } = await import("@/lib/regen/projectPacket");
    return {
      mode: "PROPOSE_ONLY",
      packet: buildRegenProjectPacket({
        title: String(proposal.proposedBody.title || "Operator-generated regen packet"),
        summary: String(proposal.proposedBody.summary || ""),
        buyerClass: String(proposal.proposedBody.buyerClass || ""),
        buyerName: String(proposal.proposedBody.buyerName || ""),
        country: String(proposal.proposedBody.country || ""),
        region: String(proposal.proposedBody.region || ""),
        methodology: String(proposal.proposedBody.methodology || ""),
      }),
    };
  }

  throw new Error(`Route is not mapped for execution: ${proposal.route}`);
}

type DerivedUsdFlow = {
  kind: "usd_in" | "usd_out";
  amountUsd: number;
};

function deriveUsdFlows(
  proposal: SkillProposalEnvelope,
  _executionResult: Record<string, unknown>
): DerivedUsdFlow[] {
  void _executionResult;
  const body = toRecord(proposal.proposedBody);
  const amountUsd =
    typeof body.amountUsd === "number" && Number.isFinite(body.amountUsd)
      ? body.amountUsd
      : undefined;
  if (typeof amountUsd !== "number" || amountUsd <= 0) return [];

  const action =
    typeof body.action === "string" ? body.action.toLowerCase() : "";
  const skillId = String(proposal.skillId || "").toLowerCase();
  const route = String(proposal.route || "");

  const tradeLike = action.startsWith("trade.") || skillId.includes("trade");
  const retireLike = action.startsWith("carbon.") || route.includes("/bridge/retire");
  const revenueLike = action.startsWith("revenue.");

  if (tradeLike || retireLike) {
    return [{ kind: "usd_out", amountUsd }];
  }
  if (revenueLike) {
    return [{ kind: "usd_in", amountUsd }];
  }
  return [];
}

export async function executeProposal(id: string): Promise<SkillProposalEnvelope> {
  const proposal = requireProposal(id);

  if (proposal.status !== "approved") {
    throw new Error("Proposal must be approved before execution.");
  }
  if (proposal.executionIntent !== "locked") {
    throw new Error("Execution intent must be locked before execution.");
  }
  if (proposal.executionStatus !== "idle") {
    throw new Error("Proposal execution is not in idle state.");
  }
  if (isBankrProposal(proposal)) {
    assertBankrExecutable(proposal);
  }
  if (!canExecuteRoute(proposal.route)) {
    throw new Error(`Execution mapping is not available for route: ${proposal.route}`);
  }
  if (routeKillSwitchBlocked(proposal.route)) {
    throw new Error("Execution blocked by policy kill switch.");
  }

  const policy = getPolicy();
  if (policy.autonomy !== "EXECUTE_WITH_LIMITS") {
    throw new Error(`Policy denies execution under autonomy level: ${policy.autonomy}`);
  }

  const policyAction = policyActionForExecution(proposal);
  assertWriteConfirmation(proposal, policyAction);
  const gate = enforcePolicy(
    policyAction,
    policyContextForExecution(proposal, policyAction, policy.autonomy)
  );
  if (!gate.ok) {
    throw new Error(
      `Execution denied by policy re-check: ${gate.reasons.join(", ") || "policy_denied"}`
    );
  }

  proposal.executionStatus = "running";
  proposal.executionStartedAt = Date.now();
  const executionId = `exec-${proposal.id}-${proposal.executionStartedAt}`;

  try {
    const result = await runRouteExecution(proposal);
    const envelope: ExecutionResultEnvelope = {
      ok: true,
      route: proposal.route,
      policyDecision: "allowed",
      timestamp: Date.now(),
      result,
    };

    proposal.executionResult = envelope;
    proposal.executionStatus = "completed";
    proposal.executionCompletedAt = Date.now();
    proposal.executionError = undefined;

    const flows = deriveUsdFlows(proposal, result);
    if (flows.length > 0) {
      for (const [index, flow] of flows.entries()) {
        try {
          insertPnlEvent({
            id: `pnl-${executionId}-${index}`,
            executionId,
            proposalId: proposal.id,
            skillId: proposal.skillId,
            action:
              typeof proposal.proposedBody.action === "string"
                ? proposal.proposedBody.action
                : undefined,
            kind: flow.kind,
            amountUsd: flow.amountUsd,
            createdAt: proposal.executionCompletedAt,
          });
        } catch (error) {
          console.error("pnl_event_insert_failed", {
            proposalId: proposal.id,
            executionId,
            index,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const strategy = ensureStrategyForProposal(proposal);
    updateStrategyStatus(strategy.id, "archived");
    return proposal;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const envelope: ExecutionResultEnvelope = {
      ok: false,
      route: proposal.route,
      policyDecision: "failed",
      timestamp: Date.now(),
      error: message,
    };

    proposal.executionResult = envelope;
    proposal.executionStatus = "failed";
    proposal.executionCompletedAt = Date.now();
    proposal.executionError = message;
    ensureStrategyForProposal(proposal);
    return proposal;
  }
}
