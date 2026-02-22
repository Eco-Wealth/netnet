import "server-only";

import { sha256Hex, stableStringify } from "@/lib/proof";
import {
  listProofRecords,
  loadProofRecord,
  saveProofRecord,
  type ProofRecord,
} from "@/lib/operator/db";

type ProofArtifactMeta = {
  sourceRoute?: string;
  action?: string;
  walletProfileId?: string;
  walletAddress?: string;
  chain?: string;
  venue?: string;
  resultSummary?: string;
  proposalId?: string;
  executionId?: string;
};

export type ProofArtifact = {
  id: string;
  schema: string;
  kind: string;
  hash: string;
  createdAt: number;
  createdAtIso: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  verifyUrl: string;
};

export type ProofVerification = ProofArtifact & {
  computedHash: string;
  payloadId?: string;
  hashMatches: boolean;
  idMatches: boolean;
  valid: boolean;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCreatedAtMs(payload: Record<string, unknown>): number {
  const candidates = [payload.timestamp, payload.createdAt, payload.ts];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate > 1e12 ? candidate : candidate * 1000;
    }
    if (typeof candidate === "string") {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return Date.now();
}

function inferSchema(payload: Record<string, unknown>): string {
  return readString(payload.schema) || "netnet.proof.unknown";
}

function inferKind(payload: Record<string, unknown>): string {
  return readString(payload.kind) || "unknown";
}

function inferHash(payload: Record<string, unknown>, schema: string): string {
  const explicitHash = readString(payload.hash);
  if (explicitHash) return explicitHash;
  const explicitId = readString(payload.id);
  if (schema === "netnet.proof.v1" && /^[a-f0-9]{64}$/i.test(explicitId)) {
    return explicitId;
  }
  return sha256Hex(stableStringify(payload));
}

function inferId(payload: Record<string, unknown>, hash: string): string {
  const explicitId = readString(payload.id);
  if (explicitId) return explicitId;
  return `proof_${hash.slice(0, 20)}`;
}

function normalizeMetadata(meta: ProofArtifactMeta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const entries = Object.entries(meta);
  for (const [key, value] of entries) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

function computeHashForSchema(
  payload: Record<string, unknown>,
  schema: string
): string {
  if (schema === "netnet.proof.v1") {
    const proofBase = {
      schema: "netnet.proof.v1",
      kind: readString(payload.kind),
      timestamp: readString(payload.timestamp),
      subject: toRecord(payload.subject),
      refs: toRecord(payload.refs),
      claims: toRecord(payload.claims),
    };
    return sha256Hex(stableStringify(proofBase));
  }
  return sha256Hex(stableStringify(payload));
}

function toArtifact(record: ProofRecord): ProofArtifact {
  return {
    id: record.id,
    schema: record.schema,
    kind: record.kind,
    hash: record.hash,
    createdAt: record.createdAt,
    createdAtIso: new Date(record.createdAt).toISOString(),
    payload: record.payload,
    metadata: record.metadata,
    verifyUrl: `/proof/${record.id}`,
  };
}

export function registerProofArtifact(
  payloadValue: unknown,
  meta: ProofArtifactMeta = {}
): ProofArtifact | null {
  const payload = toRecord(payloadValue);
  if (!Object.keys(payload).length) return null;

  const schema = inferSchema(payload);
  const kind = inferKind(payload);
  const hash = inferHash(payload, schema);
  const id = inferId(payload, hash);
  const createdAt = normalizeCreatedAtMs(payload);
  const metadata = normalizeMetadata(meta);

  saveProofRecord({
    id,
    schema,
    kind,
    hash,
    createdAt,
    payload,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  });

  return {
    id,
    schema,
    kind,
    hash,
    createdAt,
    createdAtIso: new Date(createdAt).toISOString(),
    payload,
    metadata: Object.keys(metadata).length ? metadata : undefined,
    verifyUrl: `/proof/${id}`,
  };
}

export function getProofArtifact(id: string): ProofArtifact | null {
  const record = loadProofRecord(id);
  return record ? toArtifact(record) : null;
}

export function listProofArtifacts(limit = 50): ProofArtifact[] {
  const records = listProofRecords({ limit });
  return records.map(toArtifact);
}

export function verifyProofArtifact(id: string): ProofVerification | null {
  const artifact = getProofArtifact(id);
  if (!artifact) return null;

  const computedHash = computeHashForSchema(artifact.payload, artifact.schema);
  const payloadId = readString(artifact.payload.id);
  const hashMatches =
    artifact.hash === computedHash ||
    (payloadId.length > 0 && payloadId === computedHash);
  const idMatches = payloadId.length > 0 ? payloadId === artifact.id : true;

  return {
    ...artifact,
    computedHash,
    payloadId: payloadId || undefined,
    hashMatches,
    idMatches,
    valid: hashMatches && idMatches,
  };
}
