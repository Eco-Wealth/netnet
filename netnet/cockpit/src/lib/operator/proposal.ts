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

const STRICT_SKILL_ACTION_ROUTE_MAP = {
  "bankr.agent": {
    "bankr.wallet.read": "/api/bankr/wallet",
    "bankr.token.info": "/api/bankr/token/info",
    "bankr.token.actions": "/api/bankr/token/actions",
    "bankr.launch": "/api/bankr/launch",
  },
  "zora.agent": {
    "zora.post.content": "/api/agent/zora",
  },
  "kumbaya.agent": {
    "kumbaya.post.content": "/api/agent/kumbaya",
  },
} as const;

const ACTION_ALIASES: Record<string, string> = {
  "bankr.wallet": "bankr.wallet.read",
  "bankr.quote": "bankr.token.info",
  "bankr.token.read": "bankr.token.info",
  "bankr.plan": "bankr.token.actions",
  "bankr.token.actions.plan": "bankr.token.actions",
  "token.launch": "bankr.launch",
  "zora.post": "zora.post.content",
  "zora.content.post": "zora.post.content",
  "kumbaya.post": "kumbaya.post.content",
  "kumbaya.content.post": "kumbaya.post.content",
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
    const normalizedAction =
      typeof rawAction === "string"
        ? ACTION_ALIASES[rawAction] || rawAction
        : undefined;
    const strictRoutes =
      STRICT_SKILL_ACTION_ROUTE_MAP[
        parsed.data.skillId as keyof typeof STRICT_SKILL_ACTION_ROUTE_MAP
      ];
    const strictActionSet = new Set<string>(
      Object.values(STRICT_SKILL_ACTION_ROUTE_MAP)
        .flatMap((actionMap) => Object.keys(actionMap))
    );
    const isStrictAction =
      typeof normalizedAction === "string" && strictActionSet.has(normalizedAction);

    if (strictRoutes) {
      if (!normalizedAction) return null;
      const expectedRoute =
        strictRoutes[
          normalizedAction as keyof typeof strictRoutes
        ];
      if (!expectedRoute) return null;
      if (route !== expectedRoute) return null;
    }

    if (!strictRoutes && isStrictAction) return null;

    const normalizedBody = { ...parsed.data.proposedBody };
    if (strictRoutes && normalizedAction) {
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
