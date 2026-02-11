/**
 * Unit 37 — Regenerative economics framework (principles + capitals + action→capital deltas)
 *
 * Goal: Provide a shared vocabulary + deterministic scoring helpers that both humans and agents can use.
 * - "Capitals" are buckets of value creation (not financial accounting).
 * - "Principles" guide how we score actions.
 * - "Delta" is an action's projected impact on capitals, with confidence + evidence hooks.
 *
 * Safe-by-default: these are *planning* outputs; they do not execute anything.
 */

export type CapitalId =
  | "natural"
  | "social"
  | "human"
  | "built"
  | "financial"
  | "cultural"
  | "political";

export type PrincipleId =
  | "do_no_harm"
  | "measure_then_act"
  | "additionality"
  | "permanence"
  | "leakage_control"
  | "local_benefit"
  | "transparency"
  | "operator_accountability";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type Capital = {
  id: CapitalId;
  label: string;
  description: string;
  examples: string[];
};

export type Principle = {
  id: PrincipleId;
  label: string;
  why: string;
  checks: string[];
};

export type CapitalDelta = {
  capital: CapitalId;
  // -5..+5 ordinal impact. 0 means neutral/unknown.
  score: number;
  confidence: Confidence;
  rationale: string;
  // Optional evidence references (tx hash, registry URL, doc link, etc.)
  evidence?: { kind: string; ref: string }[];
};

export type ActionDeltaV1 = {
  ok: true;
  schema: "netnet.econ.delta.v1";
  action: {
    id: string;
    type: string;
    summary: string;
    tags?: string[];
  };
  principlesApplied: PrincipleId[];
  deltas: CapitalDelta[];
  // Suggested next step for operator/agent.
  nextAction?: string;
  generatedAt: string;
};

export function clampScore(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(-5, Math.min(5, Math.trunc(n)));
}

export function capitalsCatalog(): Capital[] {
  return [
    {
      id: "natural",
      label: "Natural Capital",
      description: "Ecosystems, biodiversity, water, soil, carbon, and climate stability.",
      examples: ["Verified retirements", "IAQ + moisture control", "Habitat restoration"],
    },
    {
      id: "social",
      label: "Social Capital",
      description: "Trust, relationships, coordination capacity, and community resilience.",
      examples: ["Transparent receipts", "Partner credibility", "Shared standards"],
    },
    {
      id: "human",
      label: "Human Capital",
      description: "Skills, health, safety, and learning velocity of people in the system.",
      examples: ["Training completed", "Reduced incident risk", "Clear runbooks"],
    },
    {
      id: "built",
      label: "Built Capital",
      description: "Durable infrastructure, tools, and systems that increase capacity.",
      examples: ["Agent deployer", "Observability", "Well-designed UX workflows"],
    },
    {
      id: "financial",
      label: "Financial Capital",
      description: "Cashflow, runway, risk posture, and sustainability of the operation.",
      examples: ["Fee routing to treasury", "Cost caps", "Avoiding blow-ups"],
    },
    {
      id: "cultural",
      label: "Cultural Capital",
      description: "Narrative, norms, craftsmanship standards (Michelin-grade ops).",
      examples: ["Quality gates", "Tasteful UI", "Clear communication"],
    },
    {
      id: "political",
      label: "Political Capital",
      description: "Legitimacy, compliance, governance, and ability to operate in institutions.",
      examples: ["Auditability", "Policy configs", "Clear permissions + approvals"],
    },
  ];
}

export function principlesCatalog(): Principle[] {
  return [
    {
      id: "do_no_harm",
      label: "Do No Harm",
      why: "Avoid negative externalities while pursuing progress.",
      checks: ["Is there a credible harm pathway?", "Are safeguards/allowlists present?"],
    },
    {
      id: "measure_then_act",
      label: "Measure → Then Act",
      why: "Prefer verifiable actions over vibes; produce receipts and proofs.",
      checks: ["Is there a measurement/proof artifact?", "Is uncertainty declared?"],
    },
    {
      id: "additionality",
      label: "Additionality",
      why: "Prefer actions that create new outcomes, not re-label existing ones.",
      checks: ["Would this happen anyway?", "What changes because of this action?"],
    },
    {
      id: "permanence",
      label: "Permanence",
      why: "Prefer durable outcomes; document what keeps benefits from reversing.",
      checks: ["What breaks the outcome?", "Is there a maintenance plan?"],
    },
    {
      id: "leakage_control",
      label: "Leakage Control",
      why: "Ensure benefits aren't offset elsewhere.",
      checks: ["Could harm shift to another venue/chain/system?", "Any mitigations?"],
    },
    {
      id: "local_benefit",
      label: "Local Benefit",
      why: "Ground actions in real beneficiaries; avoid purely extractive loops.",
      checks: ["Who benefits and where?", "Are local stakeholders referenced?"],
    },
    {
      id: "transparency",
      label: "Transparency",
      why: "Make actions inspectable so trust compounds.",
      checks: ["Are logs/proofs accessible?", "Is the contract stable + documented?"],
    },
    {
      id: "operator_accountability",
      label: "Operator Accountability",
      why: "Power is gated behind approval; blame is not outsourced to the agent.",
      checks: ["Is approval required?", "Is an operator named?", "Is a kill switch available?"],
    },
  ];
}

export function generateActionDelta(input: {
  id?: string;
  type: string;
  summary: string;
  tags?: string[];
  // Optional explicit deltas to preserve operator intent.
  deltas?: Partial<CapitalDelta>[];
  principlesApplied?: PrincipleId[];
}): ActionDeltaV1 {
  const id = input.id || `act_${Math.random().toString(36).slice(2, 10)}`;
  const fallbackPrinciples: PrincipleId[] = [
    "measure_then_act",
    "transparency",
    "operator_accountability",
  ];
  const principles: PrincipleId[] = input.principlesApplied?.length
    ? input.principlesApplied
    : fallbackPrinciples;

  // Default heuristic deltas if not provided (kept conservative).
  const provided = input.deltas || [];
  const deltas: CapitalDelta[] = provided.length
    ? provided.map((d) => ({
        capital: (d.capital || "built") as CapitalId,
        score: clampScore(typeof d.score === "number" ? d.score : 0),
        confidence: (d.confidence || "LOW") as Confidence,
        rationale: d.rationale || "Operator did not provide rationale.",
        evidence: d.evidence,
      }))
    : [
        {
          capital: "built",
          score: 1,
          confidence: "LOW",
          rationale: "Default: improves system capacity if implemented correctly.",
        },
        {
          capital: "financial",
          score: 0,
          confidence: "LOW",
          rationale: "Unknown financial impact until costs/fees are measured.",
        },
        {
          capital: "transparency" as any,
          score: 0,
          confidence: "LOW",
          rationale: "Use proofs/logs to increase transparency.",
        },
      ].filter(Boolean) as any;

  // Fix the accidental 'transparency' capital above if present (defensive).
  const normalized = deltas.map((d) => {
    if ((d as any).capital === "transparency") return { ...d, capital: "social" as CapitalId };
    return d;
  });

  return {
    ok: true,
    schema: "netnet.econ.delta.v1",
    action: { id, type: input.type, summary: input.summary, tags: input.tags },
    principlesApplied: principles,
    deltas: normalized,
    nextAction: "Review deltas; attach evidence; approve or revise.",
    generatedAt: new Date().toISOString(),
  };
}
