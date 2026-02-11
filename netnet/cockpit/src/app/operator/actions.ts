"use server";

import { getPolicy } from "@/lib/policy/store";
import type { MessageEnvelope, OperatorConsoleMode } from "@/lib/operator/model";
import {
  appendOperatorEnvelope,
  appendOperatorMessage,
  listOperatorMessages,
} from "@/lib/operator/store";
import { generateAssistantReply } from "@/lib/operator/llm";

type OperatorStatus = {
  mode: OperatorConsoleMode;
  policyAutonomy: string;
  policyUpdatedAt: string;
  policyUpdatedBy: string;
};

export type OperatorThreadSnapshot = {
  status: OperatorStatus;
  messages: MessageEnvelope[];
};

function statusFromPolicy(): OperatorStatus {
  const policy = getPolicy();
  return {
    mode: "READ_ONLY",
    policyAutonomy: policy.autonomy,
    policyUpdatedAt: policy.updatedAt,
    policyUpdatedBy: policy.updatedBy,
  };
}

function policySnapshot() {
  const policy = getPolicy();
  return {
    autonomy: policy.autonomy,
    maxUsdPerDay: policy.maxUsdPerDay,
    maxUsdPerAction: policy.maxUsdPerAction,
    allowlistTokens: [...policy.allowlistTokens],
    allowlistVenues: [...policy.allowlistVenues],
    allowlistChains: [...policy.allowlistChains],
    kill: { ...policy.kill },
    updatedAt: policy.updatedAt,
    updatedBy: policy.updatedBy,
  };
}

function ensureSystemMessage() {
  const current = listOperatorMessages();
  if (current.length > 0) return;
  appendOperatorMessage({
    role: "system",
    content:
      "Operator console initialized in READ_ONLY mode. External models and execution flows are disabled.",
    metadata: {
      policySnapshot: policySnapshot(),
      action: "operator.bootstrap",
    },
  });
}

export async function readOperatorThread(): Promise<OperatorThreadSnapshot> {
  ensureSystemMessage();
  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

export async function postOperatorMessage(input: {
  content: string;
}): Promise<OperatorThreadSnapshot> {
  const content = String(input?.content ?? "").trim();
  if (!content) {
    ensureSystemMessage();
    return {
      status: statusFromPolicy(),
      messages: listOperatorMessages(),
    };
  }

  ensureSystemMessage();
  appendOperatorMessage({
    role: "operator",
    content,
    metadata: {
      policySnapshot: policySnapshot(),
      action: "operator.message",
    },
  });
  const history = listOperatorMessages();
  const assistant = await generateAssistantReply(history);
  appendOperatorEnvelope({
    ...assistant,
    role: "assistant",
    metadata: {
      ...(assistant.metadata || {}),
      policySnapshot: policySnapshot(),
      action: assistant.metadata?.action || "assistant.openrouter.reply",
    },
  });

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}
