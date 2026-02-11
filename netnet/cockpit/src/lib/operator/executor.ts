import "server-only";

import type { PolicyAction } from "@/lib/policy/types";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import { POST as tradePost } from "@/app/api/agent/trade/route";
import { POST as bankrLaunchPost } from "@/app/api/bankr/launch/route";
import { POST as bankrTokenActionsPost } from "@/app/api/bankr/token/actions/route";
import { POST as bridgeRetirePost } from "@/app/api/bridge/retire/route";

type ProposalRegistryEntry = {
  proposal: SkillProposalEnvelope;
  eligibleForExecution: boolean;
};

type RouteHandler = (req: Request) => Promise<Response>;
type SupportedRoute =
  | "/api/agent/trade"
  | "/api/bankr/launch"
  | "/api/bankr/token/actions"
  | "/api/bridge/retire";

export type ExecutionResult = {
  proposalId: string;
  route: string;
  action: PolicyAction;
  statusCode: number;
  ok: boolean;
  body: unknown;
  executedAt: number;
  error?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_PROPOSALS__:
    | Record<string, ProposalRegistryEntry>
    | undefined;
}

const ROUTE_HANDLERS: Record<SupportedRoute, RouteHandler> = {
  "/api/agent/trade": tradePost as unknown as RouteHandler,
  "/api/bankr/launch": bankrLaunchPost as unknown as RouteHandler,
  "/api/bankr/token/actions": bankrTokenActionsPost as unknown as RouteHandler,
  "/api/bridge/retire": bridgeRetirePost as unknown as RouteHandler,
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function normalizeRoute(route: string): SupportedRoute | null {
  if (route in ROUTE_HANDLERS) {
    return route as SupportedRoute;
  }
  return null;
}

function policyActionForProposal(
  route: SupportedRoute,
  body: Record<string, unknown>
): PolicyAction {
  if (route === "/api/agent/trade") return "trade.plan";
  if (route === "/api/bankr/launch") return "token.launch";
  if (route === "/api/bridge/retire") return "retire.execute";

  const action = String(body.action ?? "").trim();
  if (action === "launch") return "token.launch";
  if (action === "fee_route") return "token.manage";
  return "proof.build";
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

async function parseResponseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return { raw: await res.text().catch(() => "") };
  }
}

function internalRequest(route: string, body: Record<string, unknown>): Request {
  return new Request(`http://internal${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getProposalById(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const registry = globalThis.__NETNET_OPERATOR_PROPOSALS__;
  if (!registry) return null;
  return registry[proposalId]?.proposal ?? null;
}

export async function executeProposal(id: string): Promise<ExecutionResult> {
  const proposalId = String(id || "").trim();
  const proposal = getProposalById(proposalId);
  if (!proposal) {
    return {
      proposalId,
      route: "",
      action: "proof.build",
      statusCode: 404,
      ok: false,
      body: null,
      executedAt: Date.now(),
      error: "proposal_not_found",
    };
  }

  if (proposal.status !== "approved") {
    return {
      proposalId,
      route: proposal.route,
      action: "proof.build",
      statusCode: 409,
      ok: false,
      body: null,
      executedAt: Date.now(),
      error: "proposal_not_approved",
    };
  }
  if (proposal.executionIntent !== "locked") {
    return {
      proposalId,
      route: proposal.route,
      action: "proof.build",
      statusCode: 409,
      ok: false,
      body: null,
      executedAt: Date.now(),
      error: "execution_intent_not_locked",
    };
  }

  const route = normalizeRoute(proposal.route);
  if (!route) {
    return {
      proposalId,
      route: proposal.route,
      action: "proof.build",
      statusCode: 400,
      ok: false,
      body: null,
      executedAt: Date.now(),
      error: "unsupported_route",
    };
  }

  const body = toRecord(proposal.proposedBody);
  const action = policyActionForProposal(route, body);
  const gate = enforcePolicy(action, policyContextFromProposal(route, body));
  if (!gate.ok) {
    return {
      proposalId,
      route,
      action,
      statusCode: 403,
      ok: false,
      body: { ok: false, error: "Policy blocked", details: gate.reasons, policy: gate.policy },
      executedAt: Date.now(),
      error: "policy_blocked",
    };
  }

  const handler = ROUTE_HANDLERS[route];
  const req = internalRequest(route, body);

  try {
    const res = await handler(req);
    const responseBody = await parseResponseBody(res);
    return {
      proposalId,
      route,
      action,
      statusCode: res.status,
      ok: res.ok,
      body: responseBody,
      executedAt: Date.now(),
      error: res.ok ? undefined : `route_execution_failed_${res.status}`,
    };
  } catch (error: unknown) {
    return {
      proposalId,
      route,
      action,
      statusCode: 500,
      ok: false,
      body: null,
      executedAt: Date.now(),
      error: error instanceof Error ? error.message : "execution_failed",
    };
  }
}
