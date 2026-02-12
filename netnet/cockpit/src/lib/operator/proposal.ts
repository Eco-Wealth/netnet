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
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
});

const BANKR_ROUTES = new Set([
  "/api/bankr/*",
  "/api/bankr/launch",
  "/api/bankr/token/actions",
  "/api/bankr/token/info",
  "/api/bankr/wallet",
]);

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
    const action = parsed.data.action || actionFromBody;
    const isBankrSkill = parsed.data.skillId === "bankr.agent";
    const isBankrAction = typeof action === "string" && action.startsWith("bankr.");

    if (isBankrSkill) {
      const routeAllowed =
        BANKR_ROUTES.has(route) || route.startsWith("/api/bankr/");
      if (!routeAllowed) return null;
      if (!isBankrAction) return null;
    }

    if (!isBankrSkill && isBankrAction) return null;

    const now = Date.now();
    return {
      id: createMessageId("proposal"),
      type: "skill.proposal",
      skillId: parsed.data.skillId,
      route: parsed.data.route,
      reasoning: parsed.data.reasoning,
      proposedBody: parsed.data.proposedBody,
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
