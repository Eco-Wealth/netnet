"use server";

import { getPolicy } from "@/lib/policy/store";
import type { MessageEnvelope, OperatorConsoleMode } from "@/lib/operator/model";
import {
  approveProposal,
  appendOperatorEnvelope,
  appendOperatorMessage,
  getProposal,
  lockExecutionIntent,
  listOperatorMessages,
  requestExecutionIntent,
  registerProposal,
  rejectProposal,
} from "@/lib/operator/store";
import { generateAssistantReply } from "@/lib/operator/llm";
import { parseSkillProposalEnvelopeFromContent } from "@/lib/operator/proposal";

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
  const proposal = parseSkillProposalEnvelopeFromContent(assistant.content, {
    status: "draft",
    createdAt: Date.now(),
    executionIntent: "none",
  });
  const action = proposal ? "proposal" : "analysis";
  const updated = appendOperatorEnvelope({
    ...assistant,
    role: "assistant",
    metadata: {
      ...(assistant.metadata || {}),
      policySnapshot: policySnapshot(),
      action,
      proposal: proposal || assistant.metadata?.proposal,
    },
  });
  if (proposal) {
    const created = updated[updated.length - 1];
    if (created?.id) {
      registerProposal(created.id, proposal);
    }
  }

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

export async function approveOperatorProposal(
  id: string
): Promise<OperatorThreadSnapshot> {
  ensureSystemMessage();
  const proposalId = String(id || "").trim();
  const updated = approveProposal(proposalId);
  if (updated) {
    appendOperatorMessage({
      role: "assistant",
      content: "Proposal approved by operator.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
        proposal: updated,
      },
    });
  } else {
    appendOperatorMessage({
      role: "assistant",
      content: "Proposal not found.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
      },
    });
  }

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

export async function rejectOperatorProposal(
  id: string
): Promise<OperatorThreadSnapshot> {
  ensureSystemMessage();
  const proposalId = String(id || "").trim();
  const existing = getProposal(proposalId);
  const updated = rejectProposal(proposalId);
  if (updated || existing) {
    appendOperatorMessage({
      role: "assistant",
      content: "Proposal rejected by operator.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
        proposal: updated || existing || undefined,
      },
    });
  } else {
    appendOperatorMessage({
      role: "assistant",
      content: "Proposal not found.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
      },
    });
  }

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

export async function requestExecutionIntentAction(
  id: string
): Promise<OperatorThreadSnapshot> {
  ensureSystemMessage();
  const proposalId = String(id || "").trim();
  const updated = requestExecutionIntent(proposalId);
  if (updated) {
    appendOperatorMessage({
      role: "assistant",
      content: "Execution intent requested.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
        proposal: updated,
      },
    });
  } else {
    appendOperatorMessage({
      role: "assistant",
      content: "Execution intent request denied.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
      },
    });
  }

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}

export async function lockExecutionIntentAction(
  id: string
): Promise<OperatorThreadSnapshot> {
  ensureSystemMessage();
  const proposalId = String(id || "").trim();
  const existing = getProposal(proposalId);
  const updated = lockExecutionIntent(proposalId);
  if (updated) {
    appendOperatorMessage({
      role: "assistant",
      content: "Execution intent locked.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
        proposal: updated,
      },
    });
  } else {
    appendOperatorMessage({
      role: "assistant",
      content: "Execution intent lock denied.",
      metadata: {
        policySnapshot: policySnapshot(),
        action: "analysis",
        proposal: existing || undefined,
      },
    });
  }

  return {
    status: statusFromPolicy(),
    messages: listOperatorMessages(),
  };
}
