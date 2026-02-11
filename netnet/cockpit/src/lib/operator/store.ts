import type { MessageEnvelope, OperatorMessageRole } from "@/lib/operator/model";
import { isSkillProposalEnvelope } from "@/lib/operator/proposal";

type MessageEnvelopeInput = {
  role: OperatorMessageRole;
  content: string;
  metadata?: MessageEnvelope["metadata"];
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_MESSAGES__: MessageEnvelope[] | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_MESSAGE_SEQ__: number | undefined;
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

function normalizeMetadata(metadata: MessageEnvelope["metadata"]): MessageEnvelope["metadata"] {
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
  if (isSkillProposalEnvelope(metadata.proposal)) {
    normalized.proposal = metadata.proposal;
  }
  return Object.keys(normalized).length ? normalized : undefined;
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
    typeof v.id === "string" && v.id.trim().length > 0 ? v.id.trim() : nextMessageId();

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

function ensureUniqueId(
  candidateId: string,
  messages: MessageEnvelope[]
): string {
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
  if (!globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ || globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ <= max) {
    globalThis.__NETNET_OPERATOR_MESSAGE_SEQ__ = max + 1;
  }
}

export function listOperatorMessages(): MessageEnvelope[] {
  if (!globalThis.__NETNET_OPERATOR_MESSAGES__) {
    globalThis.__NETNET_OPERATOR_MESSAGES__ = [];
    syncSequence(globalThis.__NETNET_OPERATOR_MESSAGES__);
    return globalThis.__NETNET_OPERATOR_MESSAGES__;
  }

  const normalized = globalThis.__NETNET_OPERATOR_MESSAGES__
    .map((m) => normalizeExistingMessage(m))
    .filter((m): m is MessageEnvelope => Boolean(m));

  globalThis.__NETNET_OPERATOR_MESSAGES__ = normalized;
  syncSequence(normalized);
  return normalized;
}

export function appendOperatorMessage(input: MessageEnvelopeInput): MessageEnvelope[] {
  const current = listOperatorMessages();
  const next = normalizeEnvelope(input);
  const updated = [...current, next];
  globalThis.__NETNET_OPERATOR_MESSAGES__ = updated;
  return updated;
}

export function appendOperatorEnvelope(
  envelope: MessageEnvelope
): MessageEnvelope[] {
  const current = listOperatorMessages();
  const normalized = normalizeExistingMessage(envelope);
  if (!normalized) {
    throw new Error("invalid_message_envelope");
  }

  const next: MessageEnvelope = {
    ...normalized,
    id: ensureUniqueId(normalized.id, current),
  };
  const updated = [...current, next];
  globalThis.__NETNET_OPERATOR_MESSAGES__ = updated;
  syncSequence(updated);
  return updated;
}
