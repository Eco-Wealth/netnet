import type { OperatorMessage } from "@/lib/operator/model";

type OperatorMessageInput = {
  role: OperatorMessage["role"];
  content: string;
  skill?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_MESSAGES__: OperatorMessage[] | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedMessages(): OperatorMessage[] {
  return [
    {
      id: makeId(),
      role: "system",
      content:
        "Operator console initialized in READ_ONLY mode. External models and execution flows are disabled.",
      createdAt: nowIso(),
    },
  ];
}

export function listOperatorMessages(): OperatorMessage[] {
  if (!globalThis.__NETNET_OPERATOR_MESSAGES__) {
    globalThis.__NETNET_OPERATOR_MESSAGES__ = seedMessages();
  }
  return globalThis.__NETNET_OPERATOR_MESSAGES__!;
}

export function appendOperatorMessage(input: OperatorMessageInput): OperatorMessage[] {
  const current = listOperatorMessages();
  const next: OperatorMessage = {
    id: makeId(),
    role: input.role,
    content: input.content.trim(),
    createdAt: nowIso(),
    skill: input.skill?.trim() || undefined,
  };
  const updated = [...current, next];
  globalThis.__NETNET_OPERATOR_MESSAGES__ = updated;
  return updated;
}

