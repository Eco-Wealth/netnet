import { BankrLaunchRequest, createLaunchProposal } from "@/lib/bankr/launcher";
import { tokenActionCatalog } from "@/lib/bankr/token";
import { GET as bankrTokenInfoGet } from "@/app/api/bankr/token/info/route";
import { POST as bankrTokenActionsPost } from "@/app/api/bankr/token/actions/route";
import { GET as bankrWalletGet } from "@/app/api/bankr/wallet/route";
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
  normalizeStrategy,
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

function policyContextForExecution(proposal: SkillProposalEnvelope) {
  const body = toRecord(proposal.proposedBody);
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
    route: proposal.route,
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
  const gate = enforcePolicy(policyAction, policyContextForExecution(proposal));
  if (!gate.ok) {
    throw new Error(
      `Execution denied by policy re-check: ${gate.reasons.join(", ") || "policy_denied"}`
    );
  }

  proposal.executionStatus = "running";
  proposal.executionStartedAt = Date.now();

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
