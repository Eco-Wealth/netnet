/* Proof Objects (netnet.proof.v1)
 * Deterministic JSON proof artifacts that are human + agent readable.
 *
 * Design goals:
 * - Stable schema + strict kind enum
 * - Deterministic output for same inputs (canonical JSON + id hash)
 * - Safe-by-default (no secrets, no signing here)
 */

import crypto from "crypto";

export type ProofKind =
  | "x402"
  | "bridge_retirement"
  | "ecotoken_scan"
  | "agent_action"
  | "trade_attempt";

export type ProofSubject = {
  agentId?: string;
  wallet?: string;
  operator?: string;
};

export type ProofRefs = {
  txHash?: string;
  certificateId?: string;
  url?: string;
};

export type ProofSignature = {
  type: string; // e.g. "eip191", "eip712", "ed25519"
  value: string;
};

export type ProofObject = {
  schema: "netnet.proof.v1";
  id: string; // sha256 of canonical JSON payload (without signatures)
  kind: ProofKind;
  timestamp: string; // ISO string
  subject: ProofSubject;
  refs: ProofRefs;
  claims: Record<string, unknown>;
  signatures?: ProofSignature[];
};

// --- helpers

export function isHexTxHash(v: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(v);
}

export function isHexAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

// Canonicalize objects by sorting keys recursively.
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = canonicalize(obj[k]);
    return out;
  }
  return value;
}

export function stableStringify(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export type BuildProofInput = {
  kind: ProofKind;
  // timestamp is optional; when omitted, server will set it.
  timestamp?: string;
  subject?: ProofSubject;
  refs?: ProofRefs;
  claims?: Record<string, unknown>;
};

export function buildProofDeterministic(input: Required<BuildProofInput>): ProofObject {
  const basePayload = {
    schema: "netnet.proof.v1" as const,
    kind: input.kind,
    timestamp: input.timestamp,
    subject: input.subject,
    refs: input.refs,
    claims: input.claims,
  };
  const canonical = stableStringify(basePayload);
  const id = sha256Hex(canonical);
  return {
    ...basePayload,
    id,
  };
}

export function buildXPost(proof: ProofObject) {
  // Keep this opinionated but compact: what happened + link(s) + why it matters.
  const refs: string[] = [];
  if (proof.refs.certificateId) refs.push(`cert:${proof.refs.certificateId}`);
  if (proof.refs.txHash) refs.push(`tx:${proof.refs.txHash.slice(0, 10)}…`);
  if (proof.refs.url) refs.push(proof.refs.url);

  const who = proof.subject.agentId || proof.subject.operator || proof.subject.wallet || "operator";

  let what = "";
  switch (proof.kind) {
    case "bridge_retirement":
      what = "Carbon credits retired";
      break;
    case "ecotoken_scan":
      what = "ecoToken verification link generated";
      break;
    case "x402":
      what = "x402 paywall satisfied";
      break;
    case "agent_action":
      what = "Agent action recorded";
      break;
    case "trade_attempt":
      what = "Trade attempt (paper/plan)";
      break;
    default:
      what = "Proof created";
  }

  const why = typeof proof.claims?.["why"] === "string" ? String(proof.claims["why"]) : "verifiable, machine-readable receipt";
  const refStr = refs.length ? refs.join(" · ") : `proof:${proof.id.slice(0, 10)}…`;

  const short = `${what} by ${who}. ${refStr}. ${why}`.slice(0, 280);

  const longLines = [
    `${what}`,
    ``,
    `who: ${who}`,
    `kind: ${proof.kind}`,
    `id: ${proof.id}`,
    ...(proof.refs.txHash ? [`tx: ${proof.refs.txHash}`] : []),
    ...(proof.refs.certificateId ? [`certificate: ${proof.refs.certificateId}`] : []),
    ...(proof.refs.url ? [`link: ${proof.refs.url}`] : []),
    ``,
    `why: ${why}`,
  ];

  return { short, long: longLines.join("\n") };
}
