"use server";

import { getPolicy } from "@/lib/policy/store";
import { enforcePolicy } from "@/lib/policy/enforce";
import { generateAssistantReply } from "@/lib/operator/llm";
import { extractSkillProposalEnvelope } from "@/lib/operator/proposal";
import { GET as bankrWalletGet } from "@/app/api/bankr/wallet/route";
import { GET as bankrTokenInfoGet } from "@/app/api/bankr/token/info/route";
import {
  appendAuditMessage,
  appendMessage,
  approveProposal,
  ensureStrategyForProposal,
  executeProposal,
  generateExecutionPlan,
  listMessages,
  listProposals,
  listStrategies,
  lockExecutionIntent,
  requestExecutionIntent,
  rejectProposal,
  upsertProposal,
} from "@/lib/operator/store";

export type OperatorStateResponse = {
  messages: ReturnType<typeof listMessages>;
  proposals: ReturnType<typeof listProposals>;
  strategies: ReturnType<typeof listStrategies>;
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
  return {
    messages: listMessages(),
    proposals: listProposals(),
    strategies: listStrategies(),
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

export async function sendOperatorMessageAction(content: string): Promise<OperatorStateResponse> {
  const trimmed = String(content || "").trim();
  if (!trimmed) return state();

  appendMessage({
    role: "operator",
    content: trimmed,
    metadata: {
      action: "chat",
      tags: ["operator-input"],
      policySnapshot: policySnapshot(),
    },
  });

  try {
    const assistant = await generateAssistantReply(listMessages());
    const proposal = extractSkillProposalEnvelope(assistant.content);

    if (proposal) {
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

export async function fetchBankrWalletSnapshot(): Promise<BankrSnapshotResult> {
  const gate = enforcePolicy("token.manage", { venue: "bankr" });
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
  const gate = enforcePolicy("token.manage", {
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
