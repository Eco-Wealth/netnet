import { NextRequest, NextResponse } from "next/server";
import { createWorkItem, appendWorkEvent } from "@/lib/work/store";

type RunRequest = {
  programId: string;
  input?: Record<string, unknown>;
  createWork?: boolean;
  actor?: string; // operator/agent id
};

function safeJson(req: NextRequest) {
  return req.json().catch(() => null);
}

export async function POST(req: NextRequest) {
  const body = (await safeJson(req)) as RunRequest | null;
  if (!body || typeof body.programId !== "string" || !body.programId.trim()) {
    return NextResponse.json({ ok: false, error: "Missing programId" }, { status: 400 });
  }

  // Load presets defensively (keep bootable even if presets module changes)
  let presets: any[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/lib/programs/presets");
    presets = Array.isArray(mod?.programs) ? mod.programs : Array.isArray(mod?.default) ? mod.default : [];
  } catch {
    presets = [];
  }

  const program = presets.find((p) => p?.id === body.programId) ?? null;
  if (!program) {
    return NextResponse.json(
      { ok: false, error: "Unknown programId", known: presets.map((p) => p?.id).filter(Boolean) },
      { status: 404 }
    );
  }

  const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "operator";

  const proposed = {
    programId: program.id,
    name: program.name ?? program.id,
    requiresApproval: true as const,
    whatWillHappen: [
      "netnet will generate a step-by-step proposal (no execution).",
      "If you approve, you can run each step manually or via gated execution later.",
    ],
    steps: (program.steps ?? []).map((s: any, idx: number) => ({
      idx,
      id: s.id ?? `step_${idx}`,
      label: s.label ?? s.id ?? `Step ${idx + 1}`,
      action: s.action ?? "unknown",
      endpoint: s.endpoint ?? null,
      method: s.method ?? "GET",
      body: s.body ?? null,
    })),
    input: body.input ?? {},
  };

  let workId: string | null = null;
  if (body.createWork) {
    const item = createWorkItem({
      title: `Program run proposal: ${proposed.name}`,
      description: "Proposal-only. Review and approve steps before any execution.",
      tags: ["program", "proposal", String(program.id)],
      status: "PROPOSED",
      priority: "MEDIUM",
      owner: actor,
      data: { proposed },
    });
    workId = item.id;
    appendWorkEvent(item.id, {
      type: "PROPOSAL",
      by: actor,
      note: "Program run proposal created.",
      patch: { programId: program.id, stepCount: proposed.steps.length },
    });
  }

  return NextResponse.json({ ok: true, proposed, workId });
}

export async function GET(req: NextRequest) {
  // small discoverability surface
  const url = new URL(req.url);
  const programId = url.searchParams.get("programId");
  if (!programId) {
    return NextResponse.json({ ok: true, usage: "POST { programId, createWork?, input?, actor? }" });
  }
  return NextResponse.json({ ok: true, hint: "Use POST to generate a proposal." });
}
