import { NextRequest } from "next/server";
import { withObsJson } from "@/lib/obs";
import { feeRouting } from "@/lib/economics";
import {
  buildProofDeterministic,
  buildXPost,
  isHexTxHash,
  type ProofKind,
} from "@/lib/proof";
import { registerProofArtifact } from "@/lib/proof/registry";

const PROOF_KINDS = new Set<ProofKind>([
  "x402",
  "bridge_retirement",
  "ecotoken_scan",
  "agent_action",
  "trade_attempt",
]);

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeKind(value: unknown): ProofKind {
  const kind = readString(value) as ProofKind;
  return PROOF_KINDS.has(kind) ? kind : "agent_action";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const estimatedUsd = typeof body?.estimatedUsd === "number" ? body.estimatedUsd : 0;
  const econ = feeRouting(estimatedUsd);

  const refsInput = {
    ...toRecord(body?.refs),
    txHash: readString(body?.txHash) || readString(toRecord(body?.refs).txHash),
    certificateId:
      readString(body?.certificateId) ||
      readString(toRecord(body?.refs).certificateId),
    url: readString(body?.url) || readString(toRecord(body?.refs).url),
  };
  if (refsInput.txHash && !isHexTxHash(refsInput.txHash)) {
    return withObsJson(
      req,
      "/api/proof/build",
      {
        ok: false,
        error: {
          code: "INVALID_TX_HASH",
          message: "txHash must be 0x-prefixed 64-char hex",
        },
      },
      { status: 400 }
    );
  }

  const timestampInput = readString(body?.timestamp);
  const timestamp =
    timestampInput && Number.isFinite(Date.parse(timestampInput))
      ? new Date(timestampInput).toISOString()
      : new Date().toISOString();

  const proof = buildProofDeterministic({
    kind: sanitizeKind(body?.kind),
    timestamp,
    subject: toRecord(body?.subject),
    refs: refsInput,
    claims: toRecord(body?.claims),
  });
  const post = buildXPost(proof);
  const artifact = registerProofArtifact(proof, {
    sourceRoute: "/api/proof/build",
    action: "proof.build",
    resultSummary: `${proof.kind} proof generated`,
  });

  return withObsJson(req, "/api/proof/build", {
    ok: true,
    proof,
    post,
    verifyUrl: artifact?.verifyUrl ?? `/proof/${proof.id}`,
    economics: econ,
  });
}
