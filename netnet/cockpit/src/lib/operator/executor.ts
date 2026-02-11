import "server-only";

import type { PolicyAction } from "@/lib/policy/types";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import { POST as tradePost } from "@/app/api/agent/trade/route";
import { POST as bankrLaunchPost } from "@/app/api/bankr/launch/route";
import { POST as bankrTokenActionsPost } from "@/app/api/bankr/token/actions/route";
import { POST as bridgeRetirePost } from "@/app/api/bridge/retire/route";
import { loadProposal } from "@/lib/operator/db";

type RouteHandler = (req: Request) => Promise<Response>;
type SupportedRoute =
  | "/api/agent/trade"
  | "/api/bankr/launch"
  | "/api/bankr/token/actions"
  | "/api/bridge/retire";
type ExecutionAction =
  | "trade.plan"
  | "token.launch"
  | "token.manage"
  | "bridge.retire";

type ExecutionTarget = {
  action: ExecutionAction;
  route: SupportedRoute;
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
    policyAction: "trade.plan",
    handler: tradePost as unknown as RouteHandler,
  },
  "token.launch": {
    action: "token.launch",
    route: "/api/bankr/launch",
    policyAction: "token.launch",
    handler: bankrLaunchPost as unknown as RouteHandler,
  },
  "token.manage": {
    action: "token.manage",
    route: "/api/bankr/token/actions",
    policyAction: "token.manage",
    handler: bankrTokenActionsPost as unknown as RouteHandler,
  },
  "bridge.retire": {
    action: "bridge.retire",
    route: "/api/bridge/retire",
    policyAction: "retire.execute",
    handler: bridgeRetirePost as unknown as RouteHandler,
  },
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function policyContextFromProposal(
  route: SupportedRoute,
  body: Record<string, unknown>
) {
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
    route === "/api/agent/trade"
      ? "bankr"
      : route.startsWith("/api/bankr")
      ? "bankr"
      : route === "/api/bridge/retire"
      ? "bridge-eco"
      : undefined;

  return {
    route,
    chain: typeof body.chain === "string" ? body.chain : undefined,
    venue,
    fromToken,
    toToken,
    amountUsd,
  };
}

function internalRequest(route: SupportedRoute, body: Record<string, unknown>): Request {
  return new Request(`http://internal${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getProposalById(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const proposal = loadProposal(proposalId);
  if (!proposal) return null;
  return { ...proposal, id: proposalId };
}

function resolveExecutionTarget(
  proposal: SkillProposalEnvelope
): ExecutionTarget {
  const actionBySkill = ROUTE_EXECUTION_MAP[proposal.skillId as ExecutionAction];
  if (actionBySkill && actionBySkill.route === proposal.route) {
    return actionBySkill;
  }
  throw new ExecutionBoundaryError(
    "execution_target_unmapped",
    `Execution blocked: unmapped skill/route pair (${proposal.skillId} -> ${proposal.route}).`
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
    policyContextFromProposal(target.route, payload)
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

  const req = internalRequest(target.route, payload);
  try {
    const res = await target.handler(req);
    const routeResult = await parseRouteResponse(res);
    if (!res.ok) {
      return {
        ok: false,
        route: target.route,
        policyDecision: "ALLOW",
        timestamp: Date.now(),
        error: `route_execution_failed_${res.status}`,
        result: routeResult,
      };
    }
    return {
      ok: true,
      route: target.route,
      policyDecision: "ALLOW",
      timestamp: Date.now(),
      result: routeResult,
    };
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
