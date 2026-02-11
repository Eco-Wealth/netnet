export type ProposalStatus = "draft" | "approved" | "rejected";

export type SkillProposalEnvelope = {
  type: "skill.proposal";
  skillId: string;
  route: string;
  reasoning: string;
  proposedBody: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
  status: ProposalStatus;
  createdAt: number;
  approvedAt?: number;
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
  if (v.status !== "draft" && v.status !== "approved" && v.status !== "rejected") {
    return false;
  }
  if (typeof v.createdAt !== "number" || !Number.isFinite(v.createdAt)) return false;
  if (v.approvedAt !== undefined && (typeof v.approvedAt !== "number" || !Number.isFinite(v.approvedAt))) {
    return false;
  }
  return true;
}

type SkillProposalDraftShape = {
  type?: unknown;
  skillId?: unknown;
  route?: unknown;
  reasoning?: unknown;
  proposedBody?: unknown;
  riskLevel?: unknown;
  status?: unknown;
  createdAt?: unknown;
  approvedAt?: unknown;
};

function normalizeRiskLevel(value: unknown): SkillProposalEnvelope["riskLevel"] {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function normalizeStatus(value: unknown, fallback: ProposalStatus): ProposalStatus {
  return value === "approved" || value === "rejected" || value === "draft"
    ? value
    : fallback;
}

type CoerceOptions = {
  status?: ProposalStatus;
  createdAt?: number;
};

export function coerceSkillProposalEnvelope(
  value: unknown,
  options?: CoerceOptions
): SkillProposalEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const v = value as SkillProposalDraftShape;

  const skillId = String(v.skillId ?? "").trim();
  const route = String(v.route ?? "").trim();
  const reasoning = String(v.reasoning ?? "").trim();
  const proposedBody =
    v.proposedBody && typeof v.proposedBody === "object"
      ? (v.proposedBody as Record<string, unknown>)
      : null;

  if ((v.type ?? "skill.proposal") !== "skill.proposal") return null;
  if (!skillId || !route || !reasoning || !proposedBody) return null;

  const createdAtCandidate =
    typeof v.createdAt === "number" && Number.isFinite(v.createdAt)
      ? v.createdAt
      : options?.createdAt ?? Date.now();
  const status = normalizeStatus(v.status, options?.status ?? "draft");
  const approvedAt =
    status === "approved"
      ? typeof v.approvedAt === "number" && Number.isFinite(v.approvedAt)
        ? v.approvedAt
        : Date.now()
      : undefined;

  return {
    type: "skill.proposal",
    skillId,
    route,
    reasoning,
    proposedBody,
    riskLevel: normalizeRiskLevel(v.riskLevel),
    status,
    createdAt: createdAtCandidate,
    approvedAt,
  };
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
  content: string,
  options?: CoerceOptions
): SkillProposalEnvelope | null {
  const candidate = extractJsonObject(content);
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    return coerceSkillProposalEnvelope(parsed, options);
  } catch {
    return null;
  }
}

export function stringifySkillProposalEnvelope(
  proposal: SkillProposalEnvelope
): string {
  return JSON.stringify(proposal, null, 2);
}
