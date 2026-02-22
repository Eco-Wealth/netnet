"use server";

import { getPolicy } from "@/lib/policy/store";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { PolicyAction } from "@/lib/policy/types";
import { generateAssistantReply } from "@/lib/operator/llm";
import { extractSkillProposalEnvelope } from "@/lib/operator/proposal";
import { GET as bankrWalletGet } from "@/app/api/bankr/wallet/route";
import { GET as bankrTokenInfoGet } from "@/app/api/bankr/token/info/route";
import { simulateBankrAction } from "@/lib/bankr/simulate";
import {
  isBankrStrategyAction,
  type BankrStrategyAction,
} from "@/lib/operator/strategy";
import { buildBankrStrategyTemplate } from "@/lib/operator/strategyTemplates";
import {
  buildBankrProposalTemplate,
  listBankrTemplates,
  type BankrTemplateId,
} from "@/lib/operator/templates/bankr";
import {
  appendAuditMessage,
  appendMessage,
  approveProposal,
  createBankrStrategyDraft,
  createStrategy,
  ensureStrategyForProposal,
  executeProposal,
  getProposal,
  getStrategy,
  generateExecutionPlan,
  linkProposalToStrategy,
  listMessages,
  listProposals,
  getPnLSummary,
  getActiveWalletProfile,
  listStrategies,
  listWalletProfiles,
  pinStrategy,
  lockExecutionIntent,
  requestExecutionIntent,
  rejectProposal,
  unpinStrategy,
  updateStrategyRunbook,
  updateBankrStrategyDraft,
  upsertProposal,
  setActiveWalletProfile,
} from "@/lib/operator/store";
import { createMessageId } from "@/lib/operator/types";

export type OperatorStateResponse = {
  messages: ReturnType<typeof listMessages>;
  proposals: ReturnType<typeof listProposals>;
  strategies: ReturnType<typeof listStrategies>;
  pnl: ReturnType<typeof getPnLSummary>;
  walletProfiles: ReturnType<typeof listWalletProfiles>;
  activeWalletProfileId: string | null;
};

function policySnapshot(): Record<string, unknown> {
  const policy = getPolicy();
  return {
    autonomy: policy.autonomy,
    maxUsdPerDay: policy.maxUsdPerDay,
    maxUsdPerAction: policy.maxUsdPerAction,
    kill: policy.kill,
    updatedAt: policy.updatedAt,
  };
}

function state(): OperatorStateResponse {
  const activeWalletProfile = getActiveWalletProfile();
  return {
    messages: listMessages(),
    proposals: listProposals(),
    strategies: listStrategies(),
    pnl: getPnLSummary(),
    walletProfiles: listWalletProfiles(),
    activeWalletProfileId: activeWalletProfile?.id || null,
  };
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toSerializable(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { value: String(value) };
  }
}

async function parseInternalJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type BankrSnapshotResult = {
  ok: boolean;
  data?: any;
  error?: string;
};

export type BankrTokenInfoParams = {
  chain?: string;
  token?: string;
};

const BANKR_ACTION_ROUTE_MAP: Record<BankrStrategyAction, string> = {
  "bankr.wallet.read": "/api/bankr/wallet",
  "bankr.token.info": "/api/bankr/token/info",
  "bankr.token.actions": "/api/bankr/token/actions",
  "bankr.launch": "/api/bankr/launch",
};

function normalizeBankrPolicyAction(value: string): PolicyAction {
  if (value === "bankr.wallet.read" || value === "bankr.wallet") {
    return "bankr.wallet.read";
  }
  if (value === "bankr.token.info" || value === "bankr.quote" || value === "bankr.token.read") {
    return "bankr.token.info";
  }
  if (
    value === "bankr.token.actions" ||
    value === "bankr.plan" ||
    value === "bankr.token.actions.plan" ||
    value === "token.manage"
  ) {
    return "bankr.token.actions";
  }
  if (value === "bankr.launch" || value === "token.launch") return "bankr.launch";
  return "bankr.token.actions";
}

function inferBankrActionFromText(text: string): BankrStrategyAction | undefined {
  const normalized = text.toLowerCase();
  if (normalized.includes("wallet")) return "bankr.wallet.read";
  if (
    normalized.includes("token info") ||
    normalized.includes("metadata") ||
    normalized.includes("token details") ||
    normalized.includes("token data")
  ) {
    return "bankr.token.info";
  }
  if (normalized.includes("launch")) return "bankr.launch";
  if (
    normalized.includes("dca") ||
    normalized.includes("lp") ||
    normalized.includes("rebalance") ||
    normalized.includes("market make") ||
    normalized.includes("market-making") ||
    normalized.includes("action")
  ) {
    return "bankr.token.actions";
  }
  return undefined;
}

function inferBankrParamsFromText(text: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const chainMatch = text.match(/\b(base|ethereum|arbitrum|optimism|polygon|solana)\b/i);
  if (chainMatch) params.chain = chainMatch[1].toLowerCase();
  const tokenMatch = text.match(/\btoken[:=]?\s*([A-Za-z0-9._-]{2,16})\b/i);
  if (tokenMatch) params.token = tokenMatch[1].toUpperCase();
  const walletMatch = text.match(/\b0x[a-fA-F0-9]{8,}\b/);
  if (walletMatch) params.wallet = walletMatch[0];
  return params;
}

function titleFromText(text: string): string {
  const single = text.replace(/\s+/g, " ").trim();
  if (!single) return "Bankr ops draft";
  return single.length > 68 ? `${single.slice(0, 68)}...` : single;
}

function riskLevelForBankrAction(
  action: BankrStrategyAction
): "low" | "medium" | "high" {
  if (action === "bankr.wallet.read" || action === "bankr.token.info") return "low";
  if (action === "bankr.launch") return "high";
  return "medium";
}

function reasoningForBankrDraft(action: BankrStrategyAction, title: string): string {
  if (action === "bankr.wallet.read") {
    return `Read-only wallet snapshot draft from strategy "${title}".`;
  }
  if (action === "bankr.token.info") {
    return `Read-only token info draft from strategy "${title}".`;
  }
  if (action === "bankr.launch") {
    return `Launch proposal draft from strategy "${title}" for operator review before any execution intent.`;
  }
  return `Token actions draft from strategy "${title}" in proposal-first mode.`;
}

export async function sendOperatorMessageAction(content: string): Promise<OperatorStateResponse> {
  const trimmed = String(content || "").trim();
  if (!trimmed) return state();

  const activeWalletProfile = getActiveWalletProfile();
  appendMessage({
    role: "operator",
    content: trimmed,
    metadata: {
      action: "chat",
      tags: ["operator-input"],
      policySnapshot: policySnapshot(),
      walletProfileId: activeWalletProfile?.id,
      walletAddress: activeWalletProfile?.walletAddress || undefined,
      chain: activeWalletProfile?.chain || undefined,
      chainCaip2: activeWalletProfile?.chainCaip2 || undefined,
      venue: activeWalletProfile?.venue || undefined,
    },
  });

  try {
    const assistant = await generateAssistantReply(listMessages());
    const proposal = extractSkillProposalEnvelope(assistant.content);

    if (proposal) {
      if (activeWalletProfile) {
        proposal.metadata = {
          ...(proposal.metadata || {}),
          walletProfileId: activeWalletProfile.id,
          walletAddress: activeWalletProfile.walletAddress || undefined,
          chain: activeWalletProfile.chain,
          chainCaip2: activeWalletProfile.chainCaip2 || undefined,
          venue: activeWalletProfile.venue,
        };
      }
      upsertProposal(proposal);
      ensureStrategyForProposal(proposal);
      appendMessage({
        role: "assistant",
        content: assistant.content,
        metadata: {
          action: "proposal",
          proposalId: proposal.id,
          tags: ["proposal", proposal.riskLevel],
          policySnapshot: policySnapshot(),
        },
      });
    } else {
      appendMessage({
        role: "assistant",
        content: assistant.content,
        metadata: {
          action: "analysis",
          tags: ["assistant"],
          policySnapshot: policySnapshot(),
        },
      });
    }
  } catch (error) {
    appendAuditMessage(`Assistant generation failed: ${normalizeError(error)}`, "error");
  }

  return state();
}

export async function approveProposalAction(id: string): Promise<OperatorStateResponse> {
  try {
    approveProposal(id);
    appendAuditMessage("Proposal approved by operator.", "proposal.approve");
  } catch (error) {
    appendAuditMessage(`Approval failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function rejectProposalAction(id: string): Promise<OperatorStateResponse> {
  try {
    rejectProposal(id);
    appendAuditMessage("Proposal rejected by operator.", "proposal.reject");
  } catch (error) {
    appendAuditMessage(`Rejection failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function requestExecutionIntentAction(id: string): Promise<OperatorStateResponse> {
  try {
    requestExecutionIntent(id);
    appendAuditMessage("Execution intent requested.", "execution.intent.request");
  } catch (error) {
    appendAuditMessage(`Execution intent request failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function lockExecutionIntentAction(id: string): Promise<OperatorStateResponse> {
  try {
    lockExecutionIntent(id);
    appendAuditMessage("Execution intent locked.", "execution.intent.lock");
  } catch (error) {
    appendAuditMessage(`Lock execution intent failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function generateExecutionPlanAction(id: string): Promise<OperatorStateResponse> {
  try {
    const proposal = generateExecutionPlan(id);
    appendMessage({
      role: "skill",
      content: `Execution plan generated (dry-run).\n${proposal.executionPlan?.summary ?? ""}`,
      metadata: {
        action: "execution.plan",
        proposalId: proposal.id,
        plan: proposal.executionPlan,
        tags: ["dry-run", "plan"],
        policySnapshot: policySnapshot(),
      },
    });
  } catch (error) {
    appendAuditMessage(`Generate plan failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function executeProposalAction(id: string): Promise<OperatorStateResponse> {
  try {
    const preflight = getProposal(id);
    const isBankrRoute = Boolean(preflight?.route.includes("/api/bankr/"));
    const preflightMetadata =
      preflight && preflight.metadata && typeof preflight.metadata === "object"
        ? (preflight.metadata as Record<string, unknown>)
        : undefined;
    const simulationRecord =
      preflightMetadata && typeof preflightMetadata.simulation === "object"
        ? (preflightMetadata.simulation as Record<string, unknown>)
        : undefined;
    const simulationOk = Boolean(
      simulationRecord &&
        typeof simulationRecord.ok === "boolean" &&
        simulationRecord.ok === true
    );

    if (isBankrRoute && !simulationOk) {
      appendAuditMessage(
        "Execution blocked: run Simulate first for Bankr proposals.",
        "bankr.simulate.required"
      );
      return state();
    }

    const proposal = await executeProposal(id);
    const result = proposal.executionResult;

    if (result?.ok) {
      appendMessage({
        role: "skill",
        content: "Execution completed successfully.",
        metadata: {
          action: "execution.success",
          proposalId: proposal.id,
          executionResult: result,
          tags: ["execution", "success"],
          policySnapshot: policySnapshot(),
        },
      });
    } else {
      appendMessage({
        role: "skill",
        content: `Execution failed: ${result?.error ?? proposal.executionError ?? "Unknown error"}`,
        metadata: {
          action: "execution.failure",
          proposalId: proposal.id,
          executionResult: result,
          tags: ["execution", "failed"],
          policySnapshot: policySnapshot(),
        },
      });
    }
  } catch (error) {
    appendAuditMessage(`Execution failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function simulateBankrProposalAction(
  id: string
): Promise<OperatorStateResponse> {
  const proposal = getProposal(id);
  if (!proposal) {
    appendAuditMessage("Simulation failed: proposal not found.", "bankr.simulate");
    return state();
  }

  if (!proposal.route.includes("/api/bankr/")) {
    appendAuditMessage("Simulation skipped: proposal is not Bankr.", "bankr.simulate");
    return state();
  }

  const gate = enforcePolicy("bankr.simulate", {
    route: proposal.route,
    venue: "bankr",
    chain:
      typeof proposal.proposedBody.chain === "string"
        ? proposal.proposedBody.chain
        : undefined,
    fromToken:
      typeof proposal.proposedBody.token === "string"
        ? proposal.proposedBody.token
        : undefined,
  });
  if (!gate.ok) {
    appendAuditMessage("Simulation blocked: policy_denied.", "bankr.simulate");
    return state();
  }

  try {
    const body =
      proposal.proposedBody &&
      typeof proposal.proposedBody === "object" &&
      !Array.isArray(proposal.proposedBody)
        ? (toSerializable(proposal.proposedBody) as Record<string, unknown>)
        : {};
    const simulation = simulateBankrAction({
      ...body,
      route: proposal.route,
    });
    proposal.metadata = {
      ...(proposal.metadata || {}),
      simulation,
    };
    upsertProposal(proposal);
  } catch (error) {
    appendAuditMessage(`Simulation failed: ${normalizeError(error)}`, "bankr.simulate");
  }

  return state();
}

export async function pinStrategyAction(id: string): Promise<OperatorStateResponse> {
  try {
    pinStrategy(id);
    appendAuditMessage(`Strategy pinned: ${id}`, "strategy.pin");
  } catch (error) {
    appendAuditMessage(`Pin strategy failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function unpinStrategyAction(id: string): Promise<OperatorStateResponse> {
  try {
    unpinStrategy(id);
    appendAuditMessage(`Strategy unpinned: ${id}`, "strategy.unpin");
  } catch (error) {
    appendAuditMessage(`Unpin strategy failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function updateStrategyRunbookAction(
  id: string,
  markdown: string
): Promise<OperatorStateResponse> {
  try {
    updateStrategyRunbook(id, markdown);
    appendAuditMessage(`Runbook updated: ${id}`, "strategy.runbook.update");
  } catch (error) {
    appendAuditMessage(`Update runbook failed: ${normalizeError(error)}`, "error");
  }
  return state();
}

export async function createBankrDraftAction(
  text: string
): Promise<OperatorStateResponse> {
  const sourceText = String(text || "").trim();
  if (!sourceText) {
    appendAuditMessage("Bankr draft failed: empty input.", "strategy.bankr.draft");
    return state();
  }

  const gate = enforcePolicy("strategy.propose", { venue: "bankr" });
  if (!gate.ok) {
    appendAuditMessage("Bankr draft blocked: policy_denied", "strategy.bankr.draft");
    return state();
  }

  const action = inferBankrActionFromText(sourceText);
  const params = inferBankrParamsFromText(sourceText);
  const strategy = createBankrStrategyDraft({
    title: titleFromText(sourceText),
    notes: `sourceText: ${sourceText}`,
    bankr:
      action && isBankrStrategyAction(action)
        ? { action, params: Object.keys(params).length ? params : undefined }
        : undefined,
  });

  appendAuditMessage(`Bankr draft created: ${strategy.id}`, "strategy.bankr.draft");
  return state();
}

export async function proposeFromBankrDraftAction(
  strategyId: string
): Promise<OperatorStateResponse> {
  const activeWalletProfile = getActiveWalletProfile();
  const strategy = getStrategy(strategyId);
  if (!strategy) {
    appendAuditMessage("Bankr propose failed: strategy not found.", "proposal.from_bankr_draft");
    return state();
  }
  if (strategy.type !== "bankrOps") {
    appendAuditMessage(
      "Bankr propose failed: strategy is not bankrOps.",
      "proposal.from_bankr_draft"
    );
    return state();
  }

  const action = strategy.bankr?.action;
  if (!action || !isBankrStrategyAction(action)) {
    appendAuditMessage(
      "Bankr propose failed: draft has no valid bankr action.",
      "proposal.from_bankr_draft"
    );
    return state();
  }

  const route = BANKR_ACTION_ROUTE_MAP[action];
  const params =
    strategy.bankr?.params &&
    typeof strategy.bankr.params === "object" &&
    !Array.isArray(strategy.bankr.params)
      ? strategy.bankr.params
      : {};

  const gate = enforcePolicy(action, {
    route,
    venue: "bankr",
    chain: typeof params.chain === "string" ? params.chain : undefined,
    fromToken: typeof params.token === "string" ? params.token : undefined,
  });
  if (!gate.ok) {
    appendAuditMessage(
      "Bankr propose blocked: policy_denied",
      "proposal.from_bankr_draft"
    );
    return state();
  }

  const now = Date.now();
  const proposal = {
    id: createMessageId("proposal"),
    type: "skill.proposal" as const,
    skillId: "bankr.agent",
    route,
    reasoning: reasoningForBankrDraft(action, strategy.title),
    proposedBody: {
      action,
      input: params,
      ...params,
    },
    riskLevel: riskLevelForBankrAction(action),
    status: "draft" as const,
    createdAt: now,
    executionIntent: "none" as const,
    executionStatus: "idle" as const,
    metadata: activeWalletProfile
      ? {
          walletProfileId: activeWalletProfile.id,
          walletAddress: activeWalletProfile.walletAddress || undefined,
          chain: activeWalletProfile.chain,
          chainCaip2: activeWalletProfile.chainCaip2 || undefined,
          venue: activeWalletProfile.venue,
        }
      : undefined,
  };

  upsertProposal(proposal);
  linkProposalToStrategy(strategy.id, proposal.id);
  updateBankrStrategyDraft(strategy.id, {
    notes: strategy.notes || `sourceText: ${strategy.title}`,
    bankr: {
      action,
      params,
    },
  });

  appendMessage({
    role: "assistant",
    content: `Draft converted to proposal: ${proposal.id}\n\n\`\`\`json\n${JSON.stringify(
      proposal,
      null,
      2
    )}\n\`\`\``,
    metadata: {
      action: "proposal",
      proposalId: proposal.id,
      proposal,
      tags: ["proposal", "bankr", "from-draft", proposal.riskLevel],
      policySnapshot: policySnapshot(),
    },
  });

  return state();
}

export async function fetchBankrWalletSnapshot(): Promise<BankrSnapshotResult> {
  const gate = enforcePolicy("bankr.wallet.read", { venue: "bankr" });
  if (!gate.ok) return { ok: false, error: "policy_denied" };

  try {
    const req = new Request("http://internal/api/bankr/wallet?action=state", {
      method: "GET",
    });
    const response = await bankrWalletGet(req);
    const payload = await parseInternalJson(response);
    if (!response.ok || payload?.ok === false) {
      return {
        ok: false,
        error: payload?.error?.message ?? payload?.error ?? "wallet_unavailable",
      };
    }
    return { ok: true, data: toSerializable(payload) };
  } catch {
    return { ok: false, error: "wallet_unavailable" };
  }
}

export async function fetchBankrTokenInfoSnapshot(
  params?: BankrTokenInfoParams
): Promise<BankrSnapshotResult> {
  const gate = enforcePolicy("bankr.token.info", {
    venue: "bankr",
    chain: params?.chain,
    fromToken: params?.token,
  });
  if (!gate.ok) return { ok: false, error: "policy_denied" };

  try {
    const chain = String(params?.chain || "base");
    const token = String(params?.token || "USDC");
    const req = new Request(
      `http://internal/api/bankr/token/info?chain=${encodeURIComponent(
        chain
      )}&token=${encodeURIComponent(token)}`,
      { method: "GET" }
    );
    const response = await (
      bankrTokenInfoGet as unknown as (request?: Request) => Promise<Response>
    )(req);
    const payload = await parseInternalJson(response);
    if (!response.ok || payload?.ok === false) {
      return {
        ok: false,
        error: payload?.error?.message ?? payload?.error ?? "token_info_unavailable",
      };
    }
    return { ok: true, data: toSerializable(payload) };
  } catch {
    return { ok: false, error: "token_info_unavailable" };
  }
}

export async function proposeStrategyFromAssistantProposal(
  proposalId: string
): Promise<OperatorStateResponse> {
  const proposal = getProposal(proposalId);
  if (!proposal) {
    appendAuditMessage("Strategy draft failed: proposal not found.", "strategy.propose");
    return state();
  }

  if (proposal.status !== "approved") {
    appendAuditMessage(
      "Strategy draft failed: proposal must be approved first.",
      "strategy.propose"
    );
    return state();
  }

  const gate = enforcePolicy("strategy.propose", {
    route: proposal.route,
    chain: String(proposal.proposedBody.chain || ""),
    venue: proposal.route.includes("/bankr/") ? "bankr" : undefined,
  });
  if (!gate.ok) {
    appendAuditMessage("Strategy draft blocked: policy_denied", "strategy.propose");
    return state();
  }

  const linkedMessage = listMessages().find(
    (message) => message.metadata?.proposalId === proposal.id
  );
  const existingStrategy = listStrategies().find(
    (strategyItem) => strategyItem.linkedProposalId === proposal.id
  );

  let strategy;
  if (proposal.route.includes("/bankr/")) {
    const chain = String(proposal.proposedBody.chain || "base");
    const from = String(
      proposal.proposedBody.from ||
        proposal.proposedBody.token ||
        proposal.proposedBody.symbol ||
        "ECO"
    );
    const to = String(proposal.proposedBody.to || "USDC");
    const mode = proposal.route.includes("launch")
      ? "market-make"
      : proposal.route.includes("token/actions")
      ? "rebalance"
      : "dca";
    const riskUsdPerDay =
      typeof proposal.proposedBody.amountUsd === "number"
        ? proposal.proposedBody.amountUsd
        : typeof proposal.proposedBody.initialLiquidityUsd === "number"
        ? proposal.proposedBody.initialLiquidityUsd
        : undefined;

    strategy = createStrategy({
      ...buildBankrStrategyTemplate({
        chain,
        pair: `${from}/${to}`,
        mode,
        riskUsdPerDay,
        reason: proposal.reasoning,
      }),
      id: existingStrategy?.id,
      linkedProposalId: proposal.id,
      linkedMessageId: linkedMessage?.id,
      status: "draft",
    });
  } else {
    strategy = createStrategy({
      id: existingStrategy?.id,
      title: `Strategy: ${proposal.skillId}`,
      kind: "generic",
      status: "draft",
      linkedProposalId: proposal.id,
      linkedMessageId: linkedMessage?.id,
      notes: proposal.reasoning || `Drafted from approved proposal ${proposal.id}.`,
      scheduleHint: "daily 9am",
    });
  }

  appendAuditMessage(
    `Strategy drafted from approved proposal: ${strategy.id}`,
    "strategy.propose"
  );
  return state();
}

export async function createDraftProposalFromTemplate(
  templateId: string,
  input: Record<string, string>
): Promise<OperatorStateResponse> {
  const activeWalletProfile = getActiveWalletProfile();
  const validTemplateIds = new Set(listBankrTemplates().map((template) => template.id));
  if (!validTemplateIds.has(templateId as BankrTemplateId)) {
    appendAuditMessage("Draft proposal failed: unknown template.", "proposal.template.error");
    return state();
  }

  try {
    const proposal = buildBankrProposalTemplate(
      templateId as BankrTemplateId,
      input || {}
    );
    if (activeWalletProfile) {
      proposal.metadata = {
        ...(proposal.metadata || {}),
        walletProfileId: activeWalletProfile.id,
        walletAddress: activeWalletProfile.walletAddress || undefined,
        chain: activeWalletProfile.chain,
        chainCaip2: activeWalletProfile.chainCaip2 || undefined,
        venue: activeWalletProfile.venue,
      };
    }

    const action =
      typeof proposal.proposedBody.action === "string"
        ? proposal.proposedBody.action
        : "bankr.token.actions";
    const policyAction = normalizeBankrPolicyAction(action);

    const gate = enforcePolicy(policyAction, {
      route: proposal.route,
      venue: "bankr",
      chain: String(proposal.proposedBody.chain || ""),
      fromToken: String(
        proposal.proposedBody.token || proposal.proposedBody.from || ""
      ),
    });
    if (!gate.ok) {
      appendAuditMessage(
        "Draft proposal blocked: policy_denied",
        "proposal.template.error"
      );
      return state();
    }

    upsertProposal(proposal);
    ensureStrategyForProposal(proposal);
    const proposalJson = JSON.stringify(proposal, null, 2);

    appendMessage({
      role: "assistant",
      content: `Draft proposal generated from Bankr template.\n\n\`\`\`json\n${proposalJson}\n\`\`\``,
      metadata: {
        action: "proposal",
        proposalId: proposal.id,
        proposal,
        tags: ["proposal", "template", "bankr", proposal.riskLevel],
        policySnapshot: policySnapshot(),
      },
    });
  } catch (error) {
    appendAuditMessage(
      `Draft proposal failed: ${normalizeError(error)}`,
      "proposal.template.error"
    );
  }

  return state();
}

export async function setActiveWalletProfileAction(
  profileId: string
): Promise<OperatorStateResponse> {
  try {
    const profile = setActiveWalletProfile(profileId);
    if (profile) {
      appendAuditMessage(
        `Active wallet set: ${profile.label} (${profile.chain}/${profile.venue}).`,
        "wallet.profile.set"
      );
    }
  } catch (error) {
    appendAuditMessage(`Set wallet profile failed: ${normalizeError(error)}`, "error");
  }
  return state();
}
