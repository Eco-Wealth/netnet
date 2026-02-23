import { z } from "zod";
import { BankrLaunchRequest } from "@/lib/bankr/launcher";

export type BankrCanonicalActionId =
  | "bankr.wallet.read"
  | "bankr.token.info"
  | "bankr.token.actions"
  | "bankr.launch";

export const BANKR_ACTION_ROUTE_MAP: Record<BankrCanonicalActionId, string> = {
  "bankr.wallet.read": "/api/bankr/wallet",
  "bankr.token.info": "/api/bankr/token/info",
  "bankr.token.actions": "/api/bankr/token/actions",
  "bankr.launch": "/api/bankr/launch",
};

const BANKR_ROUTE_ACTIONS = new Set([
  "status",
  "launch",
  "fee_route",
  "execute_privy",
]);

const BANKR_ACTION_ALIASES: Record<string, BankrCanonicalActionId> = {
  "bankr.wallet": "bankr.wallet.read",
  "bankr.quote": "bankr.token.info",
  "bankr.token.read": "bankr.token.info",
  "bankr.plan": "bankr.token.actions",
  "bankr.token.actions.plan": "bankr.token.actions",
  "token.manage": "bankr.token.actions",
  "token.launch": "bankr.launch",
  status: "bankr.token.actions",
  launch: "bankr.token.actions",
  fee_route: "bankr.token.actions",
  execute_privy: "bankr.token.actions",
};

export type BankrActionValidationResult = {
  ok: boolean;
  actionId?: BankrCanonicalActionId;
  normalizedBody?: Record<string, unknown>;
  routeAction?: "status" | "launch" | "fee_route" | "execute_privy";
  errors: string[];
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function inferActionFromRoute(route: string): BankrCanonicalActionId | undefined {
  for (const [action, mappedRoute] of Object.entries(BANKR_ACTION_ROUTE_MAP)) {
    if (mappedRoute === route) return action as BankrCanonicalActionId;
  }
  return undefined;
}

export function normalizeBankrActionId(value: unknown): BankrCanonicalActionId | undefined {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return undefined;
  if (normalized in BANKR_ACTION_ROUTE_MAP) {
    return normalized as BankrCanonicalActionId;
  }
  return BANKR_ACTION_ALIASES[normalized];
}

export function deriveTokenRouteActionFromPayload(
  payload: Record<string, unknown>
): "status" | "launch" | "fee_route" | "execute_privy" {
  const actionCandidates = [
    payload.tokenAction,
    payload.routeAction,
    payload.action,
    payload.bankrActionId,
  ]
    .map((value) => normalizeString(value).toLowerCase())
    .filter(Boolean);

  const explicit = actionCandidates.find((value) => BANKR_ROUTE_ACTIONS.has(value));
  if (explicit) {
    return explicit as "status" | "launch" | "fee_route" | "execute_privy";
  }

  const nestedParams = toRecord(payload.params);
  const nestedTransaction = toRecord(nestedParams.transaction);
  const rootTransaction = toRecord(payload.transaction);
  const hasTx =
    Boolean(normalizeString(payload.to)) ||
    Boolean(normalizeString(payload.data)) ||
    Boolean(normalizeString(rootTransaction.to)) ||
    Boolean(normalizeString(nestedParams.to)) ||
    Boolean(normalizeString(nestedTransaction.to));

  return hasTx ? "execute_privy" : "status";
}

const WalletReadBodySchema = z
  .object({
    action: z.string().optional(),
    wallet: z.string().trim().min(1).optional(),
    actionType: z.enum(["balances", "positions", "history", "state"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    chain: z.string().trim().min(1).optional(),
  })
  .passthrough();

const TokenInfoBodySchema = z
  .object({
    action: z.string().optional(),
    chain: z.string().trim().min(1).optional(),
    token: z.string().trim().min(1).optional(),
  })
  .passthrough();

const TokenActionsBodySchema = z
  .object({
    action: z.string().optional(),
    tokenAction: z.string().optional(),
    routeAction: z.string().optional(),
    bankrActionId: z.string().optional(),
    params: z.record(z.unknown()).optional(),
    transaction: z.record(z.unknown()).optional(),
    walletProfileId: z.string().optional(),
    chainCaip2: z.string().optional(),
    to: z.string().optional(),
    data: z.string().optional(),
  })
  .passthrough();

function validateTokenActionsBody(body: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const routeAction = deriveTokenRouteActionFromPayload(body);
  if (routeAction !== "execute_privy") return errors;

  const params = toRecord(body.params);
  const txRoot = toRecord(body.transaction);
  const txParams = toRecord(params.transaction);
  const hasTo =
    Boolean(normalizeString(body.to)) ||
    Boolean(normalizeString(params.to)) ||
    Boolean(normalizeString(txRoot.to)) ||
    Boolean(normalizeString(txParams.to));

  if (!hasTo) {
    errors.push("execute_privy requires transaction.to (or to) in payload.");
  }
  return errors;
}

function normalizeLaunchBody(body: Record<string, unknown>): {
  normalizedBody?: Record<string, unknown>;
  errors: string[];
} {
  const candidate = {
    name: normalizeString(body.name) || "Draft Token",
    symbol: normalizeString(body.symbol) || "DRAFT",
    chain: normalizeString(body.chain) || "base",
    initialLiquidityUsd:
      typeof body.initialLiquidityUsd === "number" && Number.isFinite(body.initialLiquidityUsd)
        ? body.initialLiquidityUsd
        : undefined,
    notes:
      typeof body.notes === "string"
        ? body.notes
        : "Generated from Operator Seat execution.",
    operator: {
      id: normalizeString(toRecord(body.operator).id) || "operator",
      reason:
        normalizeString(toRecord(body.operator).reason) ||
        "Approved from Operator Seat",
    },
  };
  const parsed = BankrLaunchRequest.safeParse(candidate);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return {
    normalizedBody: {
      ...body,
      action: "bankr.launch",
      ...parsed.data,
    },
    errors: [],
  };
}

export function validateBankrActionPayload(input: {
  route: string;
  proposedBody: Record<string, unknown>;
}): BankrActionValidationResult {
  const route = String(input.route || "");
  const body = toRecord(input.proposedBody);
  const actionFromBody = normalizeBankrActionId(body.action || body.bankrActionId);
  const actionFromRoute = inferActionFromRoute(route);
  const actionId = actionFromBody || actionFromRoute;
  const errors: string[] = [];

  if (!actionId) {
    errors.push(`Unable to resolve canonical Bankr action for route: ${route}`);
    return { ok: false, errors };
  }
  if (actionFromRoute && actionFromBody && actionFromRoute !== actionFromBody) {
    errors.push(
      `Route/action mismatch: ${route} expects ${actionFromRoute} but payload resolved ${actionFromBody}.`
    );
  }

  const expectedRoute = BANKR_ACTION_ROUTE_MAP[actionId];
  if (expectedRoute !== route) {
    errors.push(`Canonical route mismatch: ${actionId} requires ${expectedRoute}, got ${route}.`);
  }

  if (actionId === "bankr.wallet.read") {
    const parsed = WalletReadBodySchema.safeParse(body);
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
      return { ok: false, actionId, errors };
    }
    return {
      ok: errors.length === 0,
      actionId,
      normalizedBody: {
        ...body,
        ...parsed.data,
        action: "bankr.wallet.read",
      },
      errors,
    };
  }

  if (actionId === "bankr.token.info") {
    const parsed = TokenInfoBodySchema.safeParse(body);
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
      return { ok: false, actionId, errors };
    }
    return {
      ok: errors.length === 0,
      actionId,
      normalizedBody: {
        ...body,
        ...parsed.data,
        action: "bankr.token.info",
        chain: normalizeString(parsed.data.chain) || "base",
        token: normalizeString(parsed.data.token) || "USDC",
      },
      errors,
    };
  }

  if (actionId === "bankr.token.actions") {
    const parsed = TokenActionsBodySchema.safeParse(body);
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
      return { ok: false, actionId, errors };
    }
    const tokenActionErrors = validateTokenActionsBody(parsed.data);
    if (tokenActionErrors.length) {
      errors.push(...tokenActionErrors);
    }
    const routeAction = deriveTokenRouteActionFromPayload(parsed.data);
    return {
      ok: errors.length === 0,
      actionId,
      routeAction,
      normalizedBody: {
        ...body,
        ...parsed.data,
        action: "bankr.token.actions",
        routeAction,
      },
      errors,
    };
  }

  const launch = normalizeLaunchBody(body);
  if (launch.errors.length) {
    return {
      ok: false,
      actionId,
      errors: [...errors, ...launch.errors],
    };
  }
  return {
    ok: errors.length === 0,
    actionId,
    normalizedBody: launch.normalizedBody,
    errors,
  };
}
