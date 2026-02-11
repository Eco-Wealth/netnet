"use server";

import { getPolicy } from "@/lib/policy/store";
import type { OperatorConsoleMode, OperatorMessage } from "@/lib/operator/model";
import { appendOperatorMessage, listOperatorMessages } from "@/lib/operator/store";

type OperatorStatus = {
  mode: OperatorConsoleMode;
  policyAutonomy: string;
  policyUpdatedAt: string;
  policyUpdatedBy: string;
};

export type OperatorThreadSnapshot = {
  status: OperatorStatus;
  messages: OperatorMessage[];
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

function localAssistantReply(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "No message content provided. READ_ONLY console accepted no-op.";
  }
  return [
    "READ_ONLY acknowledgment:",
    `Received operator message (${Math.min(trimmed.length, 280)} chars).`,
    "No external API calls, model routing, or execution steps were performed.",
  ].join(" ");
}

export async function readOperatorThread(): Promise<OperatorThreadSnapshot> {
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
    return {
      status: statusFromPolicy(),
      messages: listOperatorMessages(),
    };
  }

  appendOperatorMessage({
    role: "operator",
    content,
  });
  appendOperatorMessage({
    role: "assistant",
    content: localAssistantReply(content),
  });

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

