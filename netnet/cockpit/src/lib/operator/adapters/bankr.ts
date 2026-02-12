import type { SkillProposalEnvelope } from "@/lib/operator/proposal";

export type BankrExecutionContext = {
  proposal: SkillProposalEnvelope;
};

export type BankrActionId =
  | "bankr.wallet.read"
  | "bankr.token.info"
  | "bankr.token.actions"
  | "bankr.launch";

export type BankrExecutionTarget = {
  actionId: BankrActionId;
  route:
    | "/api/bankr/token/actions"
    | "/api/bankr/token/info"
    | "/api/bankr/wallet"
    | "/api/bankr/launch";
  method: "POST" | "GET";
};

type StructuredError = Error & { code?: string };

const BANKR_ACTION_ROUTE_MAP: Record<BankrActionId, BankrExecutionTarget> = {
  "bankr.wallet.read": {
    actionId: "bankr.wallet.read",
    route: "/api/bankr/wallet",
    method: "GET",
  },
  "bankr.token.info": {
    actionId: "bankr.token.info",
    route: "/api/bankr/token/info",
    method: "GET",
  },
  "bankr.token.actions": {
    actionId: "bankr.token.actions",
    route: "/api/bankr/token/actions",
    method: "POST",
  },
  "bankr.launch": {
    actionId: "bankr.launch",
    route: "/api/bankr/launch",
    method: "POST",
  },
};

const BANKR_ACTION_ALIASES: Record<string, BankrActionId> = {
  "bankr.quote": "bankr.token.info",
  "bankr.token.read": "bankr.token.info",
  "bankr.plan": "bankr.token.actions",
  "bankr.token.actions.plan": "bankr.token.actions",
  "token.manage": "bankr.token.actions",
  "token.launch": "bankr.launch",
};

function structuredError(code: string, message: string): StructuredError {
  const error = new Error(message) as StructuredError;
  error.code = code;
  return error;
}

function isBankrAction(value: string): value is BankrActionId {
  return value in BANKR_ACTION_ROUTE_MAP;
}

export function isBankrProposal(proposal: SkillProposalEnvelope): boolean {
  return proposal.skillId === "bankr.agent";
}

export function getBankrActionId(proposal: SkillProposalEnvelope): string {
  const rawAction =
    typeof proposal.proposedBody?.action === "string"
      ? proposal.proposedBody.action.trim()
      : "";
  if (!rawAction) return "";
  return BANKR_ACTION_ALIASES[rawAction] || rawAction;
}

export function getBankrExecutionTarget(
  context: BankrExecutionContext
): BankrExecutionTarget {
  const actionId = getBankrActionId(context.proposal);
  if (!isBankrAction(actionId)) {
    throw structuredError(
      "bankr_action_not_allowed",
      `Unsupported Bankr action: ${actionId || "missing"}`
    );
  }
  return BANKR_ACTION_ROUTE_MAP[actionId];
}

/**
 * Validates this proposal is eligible for Bankr execution.
 * Must throw a structured Error if invalid.
 */
export function assertBankrExecutable(proposal: SkillProposalEnvelope): void {
  if (!isBankrProposal(proposal)) {
    throw structuredError(
      "bankr_skill_required",
      "Proposal is not bound to bankr.agent skill."
    );
  }
  if (proposal.status !== "approved") {
    throw structuredError(
      "proposal_not_approved",
      "Proposal must be approved before execution."
    );
  }
  if (proposal.executionIntent !== "locked") {
    throw structuredError(
      "execution_intent_not_locked",
      "Execution intent must be locked before execution."
    );
  }
  if (proposal.executionStatus !== "idle") {
    throw structuredError(
      "execution_not_idle",
      "Proposal execution must be idle before execution."
    );
  }

  const target = getBankrExecutionTarget({ proposal });
  if (proposal.route !== target.route) {
    throw structuredError(
      "bankr_route_mismatch",
      `Action ${target.actionId} requires route ${target.route}, received ${proposal.route}.`
    );
  }
}
