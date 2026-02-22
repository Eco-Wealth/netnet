import { NextRequest, NextResponse } from "next/server";
import { createWork, listWork, WorkCreateInput } from "@/lib/work";

export const runtime = "nodejs";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function collectProofRefs(item: unknown): { hasProof: boolean; proofIds: string[]; verifyUrls: string[] } {
  const value = toRecord(item);
  const events = Array.isArray(value.events) ? value.events : [];
  const proofIds = new Set<string>();
  const verifyUrls = new Set<string>();
  let hasProof = false;

  for (const event of events) {
    const eventValue = toRecord(event);
    const patch = toRecord(eventValue.patch);
    const proof = toRecord(patch.proof);
    if (!Object.keys(proof).length && readString(eventValue.type) !== "PROOF_ATTACHED") continue;

    hasProof = true;
    const proofId = readString(proof.id);
    if (proofId) proofIds.add(proofId);

    const refs = toRecord(proof.refs);
    const verifyUrl = readString(refs.verifyUrl);
    if (verifyUrl) verifyUrls.add(verifyUrl);
  }

  return {
    hasProof,
    proofIds: [...proofIds],
    verifyUrls: [...verifyUrls],
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const status = (url.searchParams.get("status") || "").toUpperCase().trim();
  const owner = (url.searchParams.get("owner") || "").toLowerCase().trim();
  const hasProofParam = (url.searchParams.get("hasProof") || "").toLowerCase().trim();
  const requireProof = hasProofParam === "1" || hasProofParam === "true" || hasProofParam === "yes";
  const proofId = (url.searchParams.get("proofId") || "").trim();

  if (action !== "list") {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_ACTION", message: "Unsupported action" } },
      { status: 400 }
    );
  }

  const filtered = listWork().filter((item) => {
    const proofRefs = collectProofRefs(item);
    if (status && item.status !== status) return false;
    if (owner && (item.owner || "").toLowerCase() !== owner) return false;
    if (requireProof && !proofRefs.hasProof) return false;
    if (proofId && !proofRefs.proofIds.some((id) => id.includes(proofId))) return false;
    if (q) {
      const hay = [
        item.title,
        item.description || "",
        ...(item.tags || []),
        ...proofRefs.proofIds,
        ...proofRefs.verifyUrls,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json({ ok: true, items: filtered });
}

export async function POST(req: NextRequest) {
  let body: Partial<WorkCreateInput> = {};
  try {
    body = await req.json();
  } catch {}

  const title = (body.title || "").trim();
  if (!title) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION", message: "title is required" } },
      { status: 400 }
    );
  }

  const item = createWork({
    title,
    description: body.description,
    owner: body.owner,
    tags: body.tags,
    priority: body.priority,
    slaHours: body.slaHours,
    dueAt: body.dueAt,
    acceptanceCriteria: body.acceptanceCriteria,
    escalationPolicy: body.escalationPolicy,
    actor: body.actor || "operator",
  });

  return NextResponse.json({ ok: true, id: item.id, item }, { status: 201 });
}
