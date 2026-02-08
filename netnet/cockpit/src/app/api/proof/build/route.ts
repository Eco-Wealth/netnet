import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildProofDeterministic,
  isHexAddress,
  isHexTxHash,
  BuildProofInput,
  ProofKind,
} from "@/lib/proof";

// Normalized error shape
function err(code: string, message: string, details?: unknown, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

const ProofKindSchema = z.enum([
  "x402",
  "bridge_retirement",
  "ecotoken_scan",
  "agent_action",
  "trade_attempt",
]);

const SubjectSchema = z
  .object({
    agentId: z.string().min(1).max(120).optional(),
    wallet: z
      .string()
      .refine((v) => isHexAddress(v), "wallet must be 0x + 40 hex chars")
      .optional(),
    operator: z.string().min(1).max(120).optional(),
  })
  .default({});

const RefsSchema = z
  .object({
    txHash: z
      .string()
      .refine((v) => isHexTxHash(v), "txHash must be 0x + 64 hex chars")
      .optional(),
    certificateId: z.string().min(1).max(200).optional(),
    url: z.string().url().optional(),
  })
  .default({});

const BodySchema = z.object({
  kind: ProofKindSchema,
  // If omitted, server sets it.
  timestamp: z.string().datetime().optional(),
  subject: SubjectSchema.optional(),
  refs: RefsSchema.optional(),
  claims: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("BAD_JSON", "Request body must be valid JSON.");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION", "Invalid proof build input.", parsed.error.flatten());
  }

  const input = parsed.data as BuildProofInput;

  const normalized = {
    kind: input.kind as ProofKind,
    timestamp: input.timestamp ?? new Date().toISOString(),
    subject: input.subject ?? {},
    refs: input.refs ?? {},
    claims: input.claims ?? {},
  };

  const proof = buildProofDeterministic(normalized);

  return NextResponse.json({ ok: true, proof }, { status: 200 });
}
