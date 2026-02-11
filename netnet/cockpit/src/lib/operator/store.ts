import type { MessageEnvelope, OperatorMessageRole } from "@/lib/operator/model";
import {
  coerceSkillProposalEnvelope,
  type SkillProposalEnvelope,
} from "@/lib/operator/proposal";
import {
  buildExecutionPlan,
  isExecutionPlan,
  type ExecutionPlan,
} from "@/lib/operator/planner";
import {
  executeProposal as executeWithOrchestrator,
  type ExecutionResult,
} from "@/lib/operator/executor";
import {
  loadMessages,
  loadProposal,
  saveExecution,
  saveMessage,
  saveProposal,
} from "@/lib/operator/db";

type MessageEnvelopeInput = {
  role: OperatorMessageRole;
  content: string;
  metadata?: MessageEnvelope["metadata"];
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_MESSAGE_SEQ__: number | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_LAST_PLANS__: Record<string, ExecutionPlan> | undefined;
}

const ALLOWED_ROLES: readonly OperatorMessageRole[] = [
  "system",
  "operator",
  "assistant",
  "skill",
] as const;

function assertRole(role: string): asserts role is OperatorMessageRole {
  if (!ALLOWED_ROLES.includes(role as OperatorMessageRole)) {
    throw new Error(`invalid_message_role:${role}`);
  }
}

function nextMessageId() {
  if (!globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__) {
    globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ = 1;
  }
  const seq = globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__++;
  return `msg-${String(seq).padStart(6, "0")}`;
}

function toCreatedAt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Date.parse(value);
    if (Number.isFinite(n)) return n;
  }
  return Date.now();
}

function normalizeMetadata(
  metadata: MessageEnvelope["metadata"]
): MessageEnvelope["metadata"] {
  if (!metadata) return undefined;
  const normalized: NonNullable<MessageEnvelope["metadata"]> = {};
  if (metadata.policySnapshot && typeof metadata.policySnapshot === "object") {
    normalized.policySnapshot = metadata.policySnapshot;
  }
  if (typeof metadata.proofId === "string" && metadata.proofId.trim()) {
    normalized.proofId = metadata.proofId.trim();
  }
  if (typeof metadata.action === "string" && metadata.action.trim()) {
    normalized.action = metadata.action.trim();
  }
  if (metadata.proposal && typeof metadata.proposal === "object") {
    const proposal = coerceSkillProposalEnvelope(metadata.proposal, {
      status: "draft",
      createdAt: Date.now(),
      executionIntent: "none",
      executionStatus: "idle",
    });
    if (proposal) {
      normalized.proposal = proposal;
    }
  }
  if (metadata.plan && isExecutionPlan(metadata.plan)) {
    normalized.plan = metadata.plan;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function ensurePlanRegistry() {
  if (!globalThis.__NETNET_OPERATOR_LAST_PLANS__) {
    globalThis.__NETNET_OPERATOR_LAST_PLANS__ = {};
  }
  return globalThis.__NETNET_OPERATOR_LAST_PLANS__;
}

function normalizeEnvelope(input: MessageEnvelopeInput): MessageEnvelope {
  const role = String(input.role ?? "").trim();
  assertRole(role);
  const content = String(input.content ?? "").trim();
  if (!content) throw new Error("empty_message_content");

  return {
    id: nextMessageId(),
    role,
    content,
    createdAt: Date.now(),
    metadata: normalizeMetadata(input.metadata),
  };
}

function normalizeExistingMessage(value: unknown): MessageEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const role = String(v.role ?? "").trim();
  if (!ALLOWED_ROLES.includes(role as OperatorMessageRole)) return null;

  const content = String(v.content ?? "").trim();
  if (!content) return null;

  const id =
    typeof v.id === "string" && v.id.trim().length > 0
      ? v.id.trim()
      : nextMessageId();

  return {
    id,
    role: role as OperatorMessageRole,
    content,
    createdAt: toCreatedAt(v.createdAt),
    metadata: normalizeMetadata(
      (v.metadata as MessageEnvelope["metadata"]) ||
        (typeof v.skill === "string" ? { action: v.skill } : undefined)
    ),
  };
}

function ensureUniqueId(candidateId: string, messages: MessageEnvelope[]): string {
  if (!messages.some((m) => m.id === candidateId)) return candidateId;
  return nextMessageId();
}

function syncSequence(messages: MessageEnvelope[]) {
  let max = 0;
  for (const m of messages) {
    const match = /^msg-(\d+)$/.exec(m.id);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  if (
    !globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ ||
    globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ <= max
  ) {
    globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ = max + 1;
  }
}

function persistProposalOnMessage(message: MessageEnvelope): MessageEnvelope {
  if (!message.metadata?.proposal) return message;
  const normalizedProposal =
    coerceSkillProposalEnvelope(message.metadata.proposal, {
      id: message.id,
      status: message.metadata.proposal.status,
      createdAt: message.metadata.proposal.createdAt,
      executionIntent: message.metadata.proposal.executionIntent ?? "none",
      executionStatus: message.metadata.proposal.executionStatus ?? "idle",
    }) || message.metadata.proposal;
  const proposal = { ...normalizedProposal, id: message.id };
  saveProposal(proposal);
  if (message.metadata.proposal.id === proposal.id) return message;
  const nextMessage: MessageEnvelope = {
    ...message,
    metadata: {
      ...message.metadata,
      proposal,
    },
  };
  saveMessage(nextMessage);
  return nextMessage;
}

function updateMessageProposal(proposalId: string, proposal: SkillProposalEnvelope) {
  const messages = listOperatorMessages();
  const target = messages.find(
    (message) => message.id === proposalId && Boolean(message.metadata?.proposal)
  );
  if (!target) return;
  const updated: MessageEnvelope = {
    ...target,
    metadata: {
      ...target.metadata,
      proposal,
    },
  };
  saveMessage(updated);
}

function getProposalFromMessage(id: string): SkillProposalEnvelope | null {
  const messages = listOperatorMessages();
  const message = messages.find((m) => m.id === id);
  const proposal = message?.metadata?.proposal;
  if (!proposal) return null;
  const normalized = { ...proposal, id };
  saveProposal(normalized);
  return normalized;
}

export function listOperatorMessages(): MessageEnvelope[] {
  const normalized = loadMessages()
    .map((m) => normalizeExistingMessage(m))
    .filter((m): m is MessageEnvelope => Boolean(m));
  syncSequence(normalized);
  return normalized;
}

export function appendOperatorMessage(input: MessageEnvelopeInput): MessageEnvelope[] {
  const current = listOperatorMessages();
  const next = normalizeEnvelope(input);
  const persisted = persistProposalOnMessage(next);
  saveMessage(persisted);
  return [...current, persisted];
}

export function appendOperatorEnvelope(envelope: MessageEnvelope): MessageEnvelope[] {
  const current = listOperatorMessages();
  const normalized = normalizeExistingMessage(envelope);
  if (!normalized) {
    throw new Error("invalid_message_envelope");
  }

  const next: MessageEnvelope = {
    ...normalized,
    id: ensureUniqueId(normalized.id, current),
  };
  const persisted = persistProposalOnMessage(next);
  saveMessage(persisted);
  return [...current, persisted];
}

export function registerProposal(id: string, proposal: SkillProposalEnvelope) {
  const proposalId = String(id || "").trim();
  if (!proposalId) throw new Error("invalid_proposal_id");
  const normalized =
    coerceSkillProposalEnvelope(proposal, {
      id: proposalId,
      status: proposal.status,
      createdAt: proposal.createdAt,
      executionIntent: proposal.executionIntent ?? "none",
      executionStatus: proposal.executionStatus ?? "idle",
    }) || proposal;
  const persisted = { ...normalized, id: proposalId };
  saveProposal(persisted);
  updateMessageProposal(proposalId, persisted);
}

function persistProposalUpdate(
  proposalId: string,
  next: SkillProposalEnvelope
): SkillProposalEnvelope {
  const normalized = { ...next, id: proposalId };
  saveProposal(normalized);
  updateMessageProposal(proposalId, normalized);
  return normalized;
}

function updateProposalStatus(
  id: string,
  status: "approved" | "rejected"
): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;

  const entry = getProposal(proposalId);
  if (!entry) return null;

  const next: SkillProposalEnvelope = {
    ...entry,
    status,
    approvedAt: status === "approved" ? Date.now() : undefined,
  };
  return persistProposalUpdate(proposalId, next);
}

export function approveProposal(id: string): SkillProposalEnvelope | null {
  return updateProposalStatus(id, "approved");
}

export function rejectProposal(id: string): SkillProposalEnvelope | null {
  return updateProposalStatus(id, "rejected");
}

export function getProposal(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const proposal = loadProposal(proposalId);
  if (proposal) return { ...proposal, id: proposalId };
  return getProposalFromMessage(proposalId);
}

export function requestExecutionIntent(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const entry = getProposal(proposalId);
  if (!entry) return null;
  if (entry.status !== "approved") return null;

  const next: SkillProposalEnvelope = {
    ...entry,
    executionIntent: "requested",
    executionRequestedAt: Date.now(),
  };
  return persistProposalUpdate(proposalId, next);
}

export function lockExecutionIntent(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const entry = getProposal(proposalId);
  if (!entry) return null;
  if (entry.status !== "approved") return null;
  if (entry.executionIntent !== "requested") return null;

  const next: SkillProposalEnvelope = {
    ...entry,
    executionIntent: "locked",
    executionRequestedAt: entry.executionRequestedAt ?? Date.now(),
  };
  return persistProposalUpdate(proposalId, next);
}

export function generateExecutionPlan(id: string): ExecutionPlan | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const entry = getProposal(proposalId);
  if (!entry) return null;
  if (entry.executionIntent !== "locked") return null;

  const plan = buildExecutionPlan(entry);
  const plans = ensurePlanRegistry();
  plans[proposalId] = plan;
  return plan;
}

export type ExecuteProposalOutcome = {
  ok: boolean;
  proposal: SkillProposalEnvelope | null;
  result?: ExecutionResult;
  error?: string;
};

export async function executeProposal(
  id: string
): Promise<ExecuteProposalOutcome> {
  const proposalId = String(id || "").trim();
  if (!proposalId) {
    return { ok: false, proposal: null, error: "invalid_proposal_id" };
  }

  const entry = getProposal(proposalId);
  if (!entry) {
    return { ok: false, proposal: null, error: "proposal_not_found" };
  }
  if (entry.status !== "approved") {
    return { ok: false, proposal: entry, error: "proposal_not_approved" };
  }
  if (entry.executionIntent !== "locked") {
    return { ok: false, proposal: entry, error: "execution_intent_not_locked" };
  }
  if ((entry.executionStatus ?? "idle") !== "idle") {
    return { ok: false, proposal: entry, error: "execution_already_started" };
  }

  const startedAt = Date.now();
  const running = persistProposalUpdate(proposalId, {
    ...entry,
    executionStatus: "running",
    executionStartedAt: startedAt,
    executionCompletedAt: undefined,
    executionResult: undefined,
    executionError: undefined,
  });
  saveExecution({
    id: proposalId,
    proposalId,
    status: "running",
    startedAt,
    completedAt: undefined,
    result: undefined,
    error: undefined,
  });

  const result = await executeWithOrchestrator(proposalId);
  const completedAt = Date.now();

  if (result.ok) {
    const completed = persistProposalUpdate(proposalId, {
      ...running,
      executionStatus: "completed",
      executionCompletedAt: completedAt,
      executionResult: result as unknown as Record<string, unknown>,
      executionError: undefined,
    });
    saveExecution({
      id: proposalId,
      proposalId,
      status: "completed",
      startedAt: running.executionStartedAt,
      completedAt,
      result: result as unknown as Record<string, unknown>,
      error: undefined,
    });
    return { ok: true, proposal: completed, result };
  }

  const failed = persistProposalUpdate(proposalId, {
    ...running,
    executionStatus: "failed",
    executionCompletedAt: completedAt,
    executionResult: result as unknown as Record<string, unknown>,
    executionError: result.error ?? "execution_failed",
  });
  saveExecution({
    id: proposalId,
    proposalId,
    status: "failed",
    startedAt: running.executionStartedAt,
    completedAt,
    result: result as unknown as Record<string, unknown>,
    error: failed.executionError,
  });
  return { ok: false, proposal: failed, result, error: failed.executionError };
}

export function isProposalEligible(id: string): boolean {
  const proposalId = String(id || "").trim();
  if (!proposalId) return false;
  const proposal = getProposal(proposalId);
  if (!proposal) return false;
  return proposal.status === "approved";
}
