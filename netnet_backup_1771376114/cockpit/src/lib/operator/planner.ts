import type { ExecutionPlan, SkillProposalEnvelope } from "@/lib/operator/types";

export type { ExecutionPlan } from "@/lib/operator/types";

const SENSITIVE_KEYS = ["secret", "token", "apiKey", "authorization", "password", "privateKey"];

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function sanitizePreview(input: unknown): Record<string, unknown> {
  const source = toRecord(input);
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const lowered = key.toLowerCase();
    if (SENSITIVE_KEYS.some((token) => lowered.includes(token.toLowerCase()))) {
      sanitized[key] = "[redacted]";
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function inferAction(proposal: SkillProposalEnvelope): string {
  const body = toRecord(proposal.proposedBody);
  if (typeof body.action === "string" && body.action.trim().length > 0) {
    return body.action.trim();
  }
  return proposal.skillId;
}

function inferMethod(route: string): "GET" | "POST" {
  if (route === "/api/bankr/token/info" || route === "/api/bankr/wallet") return "GET";
  return "POST";
}

export function buildExecutionPlan(proposal: SkillProposalEnvelope): ExecutionPlan {
  const action = inferAction(proposal);
  const method = inferMethod(proposal.route);
  const payloadPreview = sanitizePreview(proposal.proposedBody);
  return {
    proposalId: proposal.id,
    createdAt: Date.now(),
    steps: [
      {
        stepId: `${proposal.id}-step-01`,
        skill: proposal.skillId,
        action,
        method,
        route: proposal.route,
        payloadPreview,
        requiresPolicy: true,
      },
    ],
    summary: `Would call ${method} ${proposal.route} for action ${action} (dry-run).`,
  };
}
