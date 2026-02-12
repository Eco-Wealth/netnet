import "server-only";

import type { PolicyAction } from "@/lib/policy/types";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import { POST as tradePost } from "@/app/api/agent/trade/route";
import { POST as bankrLaunchPost } from "@/app/api/bankr/launch/route";
import { POST as bankrTokenActionsPost } from "@/app/api/bankr/token/actions/route";
import { GET as bankrTokenInfoGet } from "@/app/api/bankr/token/info/route";
import { GET as bankrWalletGet } from "@/app/api/bankr/wallet/route";
import { POST as bridgeRetirePost } from "@/app/api/bridge/retire/route";
import {
  assertBankrExecutable,
  getBankrActionId,
  isBankrProposal,
} from "@/lib/operator/adapters/bankr";
import { insertPnlEvent, loadProposal } from "@/lib/operator/db";

type RouteHandler = (req: Request) => Promise<Response>;
type SupportedRoute =
  | "/api/agent/trade"
  | "/api/bankr/launch"
  | "/api/bankr/token/actions"
  | "/api/bankr/token/info"
  | "/api/bankr/wallet"
  | "/api/bridge/retire";
type ExecutionAction =
  | "trade.plan"
  | "bankr.wallet"
  | "bankr.wallet.read"
  | "bankr.token.info"
  | "bankr.token.actions"
  | "bankr.launch"
  | "bankr.plan"
  | "bankr.quote"
  | "bankr.token.read"
  | "bankr.token.actions.plan"
  | "token.launch"
  | "token.manage"
  | "bridge.retire";

type ExecutionTarget = {
  action: ExecutionAction;
  route: SupportedRoute;
  method: "POST" | "GET";
  policyAction: PolicyAction;
  handler: RouteHandler;
};

export type ExecutionAuditEnvelope = {
  ok: boolean;
  route: string;
  policyDecision: string;
  timestamp: number;
  result?: Record<string, unknown>;
  error?: string;
};

export class ExecutionBoundaryError extends Error {
  code: string;
  auditMessage: string;

  constructor(code: string, auditMessage: string, message?: string) {
    super(message ?? code);
    this.name = "ExecutionBoundaryError";
    this.code = code;
    this.auditMessage = auditMessage;
  }
}

const ROUTE_EXECUTION_MAP: Record<ExecutionAction, ExecutionTarget> = {
  "trade.plan": {
    action: "trade.plan",
    route: "/api/agent/trade",
    method: "POST",
    policyAction: "trade.plan",
    handler: tradePost as unknown as RouteHandler,
  },
  "bankr.wallet": {
    action: "bankr.wallet",
    route: "/api/bankr/wallet",
    method: "GET",
    policyAction: "bankr.wallet.read",
    handler: bankrWalletGet as unknown as RouteHandler,
  },
  "bankr.wallet.read": {
    action: "bankr.wallet.read",
    route: "/api/bankr/wallet",
    method: "GET",
    policyAction: "bankr.wallet.read",
    handler: bankrWalletGet as unknown as RouteHandler,
  },
  "bankr.token.info": {
    action: "bankr.token.info",
    route: "/api/bankr/token/info",
    method: "GET",
    policyAction: "bankr.token.info",
    handler: (bankrTokenInfoGet as unknown as RouteHandler),
  },
  "bankr.token.actions": {
    action: "bankr.token.actions",
    route: "/api/bankr/token/actions",
    method: "POST",
    policyAction: "bankr.token.actions",
    handler: bankrTokenActionsPost as unknown as RouteHandler,
  },
  "bankr.launch": {
    action: "bankr.launch",
    route: "/api/bankr/launch",
    method: "POST",
    policyAction: "bankr.launch",
    handler: bankrLaunchPost as unknown as RouteHandler,
  },
  "bankr.plan": {
    action: "bankr.plan",
    route: "/api/bankr/token/actions",
    method: "POST",
    policyAction: "bankr.token.actions",
    handler: bankrTokenActionsPost as unknown as RouteHandler,
  },
  "bankr.quote": {
    action: "bankr.quote",
    route: "/api/bankr/token/info",
    method: "GET",
    policyAction: "bankr.token.info",
    handler: (bankrTokenInfoGet as unknown as RouteHandler),
  },
  "bankr.token.read": {
    action: "bankr.token.read",
    route: "/api/bankr/token/info",
    method: "GET",
    policyAction: "bankr.token.info",
    handler: (bankrTokenInfoGet as unknown as RouteHandler),
  },
  "bankr.token.actions.plan": {
    action: "bankr.token.actions.plan",
    route: "/api/bankr/token/actions",
    method: "POST",
    policyAction: "bankr.token.actions",
    handler: bankrTokenActionsPost as unknown as RouteHandler,
  },
  "token.launch": {
    action: "token.launch",
    route: "/api/bankr/launch",
    method: "POST",
    policyAction: "token.launch",
    handler: bankrLaunchPost as unknown as RouteHandler,
  },
  "token.manage": {
    action: "token.manage",
    route: "/api/bankr/token/actions",
    method: "POST",
    policyAction: "token.manage",
    handler: bankrTokenActionsPost as unknown as RouteHandler,
  },
  "bridge.retire": {
    action: "bridge.retire",
    route: "/api/bridge/retire",
    method: "POST",
    policyAction: "retire.execute",
    handler: bridgeRetirePost as unknown as RouteHandler,
  },
};

const BANKR_READ_ACTIONS = new Set<string>([
  "bankr.wallet",
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

export function isWriteAction(action: string): boolean {
  if (BANKR_READ_ACTIONS.has(action)) return false;
  if (BANKR_WRITE_ACTIONS.has(action)) return true;
  return true;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

type UsdFlow = {
  kind: "usd_in" | "usd_out";
  amountUsd: number;
};

export function deriveUsdFlows(
  proposal: SkillProposalEnvelope,
  _executionResult: ExecutionAuditEnvelope
): UsdFlow[] {
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

  const isTradeLike = action.startsWith("trade.") || skillId.includes("trade");
  const isCarbonLike =
    action.startsWith("carbon.") || route.includes("/bridge/retire");
  const isRevenueLike = action.startsWith("revenue.");

  if (isTradeLike || isCarbonLike) {
    return [{ kind: "usd_out", amountUsd }];
  }
  if (isRevenueLike) {
    return [{ kind: "usd_in", amountUsd }];
  }
  return [];
}

function hasConfirmedWrite(proposal: SkillProposalEnvelope): boolean {
  return proposal.metadata?.confirmedWrite === true;
}

function policyContextFromProposal(
  proposal: SkillProposalEnvelope,
  target: ExecutionTarget,
  body: Record<string, unknown>
) {
  const metadata = toRecord(proposal.metadata);
  const snapshot = toRecord(metadata.policySnapshot);
  const policyMode =
    typeof metadata.policyMode === "string"
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
  const venue =
    target.route === "/api/agent/trade"
      ? "bankr"
      : target.route.startsWith("/api/bankr")
      ? "bankr"
      : target.route === "/api/bridge/retire"
      ? "bridge-eco"
      : undefined;

  return {
    proposalId: proposal.id,
    action: target.action,
    route: target.route,
    policyMode,
    operatorId:
      typeof metadata.operatorId === "string" ? metadata.operatorId : undefined,
    operatorRole:
      typeof metadata.operatorRole === "string"
        ? metadata.operatorRole
        : undefined,
    chain: typeof body.chain === "string" ? body.chain : undefined,
    venue,
    fromToken,
    toToken,
    amountUsd,
  };
}

function internalRequest(target: ExecutionTarget, body: Record<string, unknown>): Request {
  if (target.method === "GET") {
    if (target.route === "/api/bankr/wallet") {
      const wallet =
        typeof body.wallet === "string" && body.wallet.trim()
          ? `&wallet=${encodeURIComponent(body.wallet.trim())}`
          : "";
      return new Request(`http://internal${target.route}?action=state${wallet}`, {
        method: "GET",
      });
    }
    if (target.route === "/api/bankr/token/info") {
      const chain = encodeURIComponent(String(body.chain || "base"));
      const token = encodeURIComponent(String(body.token || "USDC"));
      return new Request(`http://internal${target.route}?chain=${chain}&token=${token}`, {
        method: "GET",
      });
    }
    return new Request(`http://internal${target.route}`, { method: "GET" });
  }

  const nextBody =
    target.action === "bankr.token.actions" ||
    target.action === "bankr.plan" ||
    target.action === "bankr.token.actions.plan"
      ? {
          action: "status",
          params: { ...body, bankrActionId: target.action },
        }
      : body;

  return new Request(`http://internal${target.route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(nextBody),
  });
}

function getProposalById(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const proposal = loadProposal(proposalId);
  if (!proposal) return null;
  return { ...proposal, id: proposalId };
}

function resolveExecutionAction(proposal: SkillProposalEnvelope): ExecutionAction {
  if (isBankrProposal(proposal)) {
    assertBankrExecutable(proposal);
    const action = getBankrActionId(proposal);
    if (action in ROUTE_EXECUTION_MAP) return action as ExecutionAction;
    throw new ExecutionBoundaryError(
      "execution_target_unmapped",
      `Execution blocked: unsupported bankr action (${action || "missing"}).`
    );
  }

  const actionBySkill = ROUTE_EXECUTION_MAP[proposal.skillId as ExecutionAction];
  if (actionBySkill) return actionBySkill.action;
  throw new ExecutionBoundaryError(
    "execution_target_unmapped",
    `Execution blocked: unmapped skill (${proposal.skillId}).`
  );
}

function resolveExecutionTarget(
  proposal: SkillProposalEnvelope
): ExecutionTarget {
  const action = resolveExecutionAction(proposal);
  const target = ROUTE_EXECUTION_MAP[action];
  if (target.route === proposal.route) return target;
  throw new ExecutionBoundaryError(
    "execution_target_unmapped",
    `Execution blocked: unmapped action/route pair (${action} -> ${proposal.route}).`
  );
}

function assertExecutionPreconditions(proposal: SkillProposalEnvelope | null): asserts proposal is SkillProposalEnvelope {
  if (!proposal) {
    throw new ExecutionBoundaryError(
      "proposal_not_found",
      "Execution blocked: proposal not found."
    );
  }
  if (proposal.status !== "approved") {
    throw new ExecutionBoundaryError(
      "proposal_not_approved",
      "Execution blocked: proposal is not approved."
    );
  }
  if (proposal.executionIntent !== "locked") {
    throw new ExecutionBoundaryError(
      "execution_intent_not_locked",
      "Execution blocked: execution intent is not locked."
    );
  }
  if ((proposal.executionStatus ?? "idle") !== "idle") {
    throw new ExecutionBoundaryError(
      "execution_not_idle",
      "Execution blocked: proposal execution is not idle."
    );
  }
}

export function validateExecutionBoundary(
  proposal: SkillProposalEnvelope | null
): { route: SupportedRoute; action: ExecutionAction } {
  assertExecutionPreconditions(proposal);
  const target = resolveExecutionTarget(proposal);
  if (
    target.route.startsWith("/api/bankr") &&
    isWriteAction(target.action) &&
    !hasConfirmedWrite(proposal)
  ) {
    throw new ExecutionBoundaryError(
      "write_confirmation_required",
      `Execution blocked: ${target.action} requires metadata.confirmedWrite=true.`
    );
  }
  return { route: target.route, action: target.action };
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

export async function executeProposal(
  id: string,
  snapshot?: SkillProposalEnvelope
): Promise<ExecutionAuditEnvelope> {
  const proposal = snapshot ?? getProposalById(id);
  validateExecutionBoundary(proposal ?? null);
  const frozenSnapshot = JSON.parse(
    JSON.stringify(proposal)
  ) as SkillProposalEnvelope;
  const target = resolveExecutionTarget(frozenSnapshot);
  const payload = toRecord(frozenSnapshot.proposedBody);
  const gate = enforcePolicy(
    target.policyAction,
    policyContextFromProposal(frozenSnapshot, target, payload)
  );
  if (!gate.ok) {
    return {
      ok: false,
      route: target.route,
      policyDecision: "DENY",
      timestamp: Date.now(),
      error: "policy_denied",
      result: {
        reasons: gate.reasons,
      },
    };
  }

  const req = internalRequest(target, payload);
  try {
    const res = await target.handler(req);
    const routeResult = await parseRouteResponse(res);
    const executionTimestamp = Date.now();
    const executionId = `exec-${frozenSnapshot.id}-${executionTimestamp}`;
    if (!res.ok) {
      return {
        ok: false,
        route: target.route,
        policyDecision: "ALLOW",
        timestamp: executionTimestamp,
        error: `route_execution_failed_${res.status}`,
        result: routeResult,
      };
    }
    const successEnvelope: ExecutionAuditEnvelope = {
      ok: true,
      route: target.route,
      policyDecision: "ALLOW",
      timestamp: executionTimestamp,
      result: routeResult,
    };
    const flows = deriveUsdFlows(frozenSnapshot, successEnvelope);
    for (const [index, flow] of flows.entries()) {
      try {
        insertPnlEvent({
          id: `pnl-${executionId}-${index}`,
          executionId,
          proposalId: frozenSnapshot.id,
          skillId: frozenSnapshot.skillId,
          action:
            typeof payload.action === "string" ? String(payload.action) : undefined,
          kind: flow.kind,
          amountUsd: flow.amountUsd,
          createdAt: executionTimestamp,
        });
      } catch (error: unknown) {
        console.error("pnl_event_insert_failed", {
          proposalId: frozenSnapshot.id,
          executionId,
          index,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return successEnvelope;
  } catch (error: unknown) {
    return {
      ok: false,
      route: target.route,
      policyDecision: "ALLOW",
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : "execution_failed",
    };
  }
}
