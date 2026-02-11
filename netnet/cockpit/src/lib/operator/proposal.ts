export type SkillProposalEnvelope = {
  type: "skill.proposal";
  skillId: string;
  route: string;
  reasoning: string;
  proposedBody: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
};

export function isSkillProposalEnvelope(
  value: unknown
): value is SkillProposalEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.type !== "skill.proposal") return false;
  if (typeof v.skillId !== "string" || !v.skillId.trim()) return false;
  if (typeof v.route !== "string" || !v.route.trim()) return false;
  if (typeof v.reasoning !== "string" || !v.reasoning.trim()) return false;
  if (!v.proposedBody || typeof v.proposedBody !== "object") return false;
  if (v.riskLevel !== "low" && v.riskLevel !== "medium" && v.riskLevel !== "high") {
    return false;
  }
  return true;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export function parseSkillProposalEnvelopeFromContent(
  content: string
): SkillProposalEnvelope | null {
  const candidate = extractJsonObject(content);
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    if (!isSkillProposalEnvelope(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function stringifySkillProposalEnvelope(
  proposal: SkillProposalEnvelope
): string {
  return JSON.stringify(proposal, null, 2);
}

