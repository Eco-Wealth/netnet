export type ProposalStatus = "draft" | "approved" | "rejected";
export type ExecutionIntentStatus = "none" | "requested" | "locked";

export type SkillProposalEnvelope = {
  type: "skill.proposal";
  id: string;
  skillId: string;
  route: string;
  reasoning: string;
  proposedBody: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
  status: ProposalStatus;
  createdAt: number;
  approvedAt?: number;
  executionIntent?: ExecutionIntentStatus;
  executionRequestedAt?: number;
};

export function isSkillProposalEnvelope(
  value: unknown
): value is SkillProposalEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.type !== "skill.proposal") return false;
  if (typeof v.id !== "string" || !v.id.trim()) return false;
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
  if (
    v.executionIntent !== undefined &&
    v.executionIntent !== "none" &&
    v.executionIntent !== "requested" &&
    v.executionIntent !== "locked"
  ) {
    return false;
  }
  if (
    v.executionRequestedAt !== undefined &&
    (typeof v.executionRequestedAt !== "number" || !Number.isFinite(v.executionRequestedAt))
  ) {
    return false;
  }
  return true;
}

type SkillProposalDraftShape = {
  type?: unknown;
  id?: unknown;
  skillId?: unknown;
  route?: unknown;
  reasoning?: unknown;
  proposedBody?: unknown;
  riskLevel?: unknown;
  status?: unknown;
  createdAt?: unknown;
  approvedAt?: unknown;
  executionIntent?: unknown;
  executionRequestedAt?: unknown;
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

function normalizeExecutionIntent(
  value: unknown,
  fallback: ExecutionIntentStatus
): ExecutionIntentStatus {
  return value === "none" || value === "requested" || value === "locked"
    ? value
    : fallback;
}

type CoerceOptions = {
  id?: string;
  status?: ProposalStatus;
  createdAt?: number;
  executionIntent?: ExecutionIntentStatus;
};

function hashText(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function deterministicProposalId(
  skillId: string,
  route: string,
  reasoning: string,
  proposedBody: Record<string, unknown>
) {
  const seed = `${skillId}|${route}|${reasoning}|${JSON.stringify(proposedBody)}`;
  return `proposal-${hashText(seed)}`;
}

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
  const executionIntent = normalizeExecutionIntent(
    v.executionIntent,
    options?.executionIntent ?? "none"
  );
  const executionRequestedAt =
    executionIntent === "requested" || executionIntent === "locked"
      ? typeof v.executionRequestedAt === "number" && Number.isFinite(v.executionRequestedAt)
        ? v.executionRequestedAt
        : executionIntent === "requested"
        ? Date.now()
        : undefined
      : undefined;

  const id =
    String(v.id ?? options?.id ?? "").trim() ||
    deterministicProposalId(skillId, route, reasoning, proposedBody);

  return {
    type: "skill.proposal",
    id,
    skillId,
    route,
    reasoning,
    proposedBody,
    riskLevel: normalizeRiskLevel(v.riskLevel),
    status,
    createdAt: createdAtCandidate,
    approvedAt,
    executionIntent,
    executionRequestedAt,
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
