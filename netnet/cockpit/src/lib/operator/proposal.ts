import { z } from "zod";
import type { SkillProposalEnvelope } from "@/lib/operator/types";
import { createMessageId } from "@/lib/operator/types";

export type { SkillProposalEnvelope } from "@/lib/operator/types";

const BaseProposal = z.object({
  type: z.literal("skill.proposal"),
  skillId: z.string().min(1),
  route: z.string().min(1),
  action: z.string().min(1).optional(),
  reasoning: z.string().min(1),
  proposedBody: z.record(z.unknown()).default({}),
  metadata: z
    .object({
      confirmedWrite: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
});

const BANKR_ACTION_ROUTE_MAP = {
  "bankr.wallet.read": "/api/bankr/wallet",
  "bankr.token.info": "/api/bankr/token/info",
  "bankr.token.actions": "/api/bankr/token/actions",
  "bankr.launch": "/api/bankr/launch",
} as const;

const BANKR_ACTION_ALIASES: Record<string, keyof typeof BANKR_ACTION_ROUTE_MAP> = {
  "bankr.wallet": "bankr.wallet.read",
  "bankr.quote": "bankr.token.info",
  "bankr.token.read": "bankr.token.info",
  "bankr.plan": "bankr.token.actions",
  "bankr.token.actions.plan": "bankr.token.actions",
  "token.launch": "bankr.launch",
};

function tryParseJson(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("No JSON object found in assistant response.");
}

export function extractSkillProposalEnvelope(content: string): SkillProposalEnvelope | null {
  try {
    const raw = tryParseJson(content);
    const parsed = BaseProposal.safeParse(raw);
    if (!parsed.success) return null;

    const route = parsed.data.route;
    const actionFromBody =
      typeof parsed.data.proposedBody?.action === "string"
        ? parsed.data.proposedBody.action
        : undefined;
    const rawAction = parsed.data.action || actionFromBody;
    const isBankrSkill = parsed.data.skillId === "bankr.agent";
    const normalizedAction =
      typeof rawAction === "string"
        ? BANKR_ACTION_ALIASES[rawAction] || rawAction
        : undefined;
    const isBankrAction =
      typeof normalizedAction === "string" &&
      Object.prototype.hasOwnProperty.call(BANKR_ACTION_ROUTE_MAP, normalizedAction);

    if (isBankrSkill) {
      if (!isBankrAction) return null;
      const expectedRoute =
        BANKR_ACTION_ROUTE_MAP[
          normalizedAction as keyof typeof BANKR_ACTION_ROUTE_MAP
        ];
      if (route !== expectedRoute) return null;
    }

    if (!isBankrSkill && isBankrAction) return null;

    const normalizedBody = { ...parsed.data.proposedBody };
    if (isBankrSkill && normalizedAction) {
      normalizedBody.action = normalizedAction;
    } else if (parsed.data.action && typeof normalizedBody.action !== "string") {
      normalizedBody.action = parsed.data.action;
    }

    const now = Date.now();
    return {
      id: createMessageId("proposal"),
      type: "skill.proposal",
      skillId: parsed.data.skillId,
      route: parsed.data.route,
      reasoning: parsed.data.reasoning,
      proposedBody: normalizedBody,
      metadata: parsed.data.metadata,
      riskLevel: parsed.data.riskLevel,
      status: "draft",
      createdAt: now,
      executionIntent: "none",
      executionStatus: "idle",
    };
  } catch {
    return null;
  }
}
