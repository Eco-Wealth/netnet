import { NextResponse } from "next/server";
import { computeAllocations, type AllocationPolicy, type AllocationInput } from "@/lib/economics/allocation";

export const dynamic = "force-dynamic";

const DEFAULT_POLICY: AllocationPolicy = {
  operatorPct: 0.40,
  inferencePct: 0.20,
  microRetirePct: 0.10,
  treasuryPct: 0.30,
  minMicroRetireUsd: 0.50,
};

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  return json({
    ok: true,
    actions: ["info", "plan"],
    nextAction: "POST action=plan with realizedFeesUsd",
    defaultPolicy: DEFAULT_POLICY,
    safety: {
      note: "This endpoint never moves funds. It outputs an allocation plan that requires operator approval.",
    },
  });
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const action = (body?.action || "plan") as string;
  if (action !== "plan") {
    return json({ ok: false, error: { code: "BAD_ACTION", message: "Use action=plan" } }, 400);
  }

  const input: AllocationInput = {
    realizedFeesUsd: Number(body?.realizedFeesUsd ?? 0),
    inferenceSpendUsd: body?.inferenceSpendUsd != null ? Number(body.inferenceSpendUsd) : undefined,
    note: typeof body?.note === "string" ? body.note : undefined,
  };

  const policy: AllocationPolicy = { ...DEFAULT_POLICY, ...(body?.policy || {}) };

  const plan = computeAllocations(input, policy);
  return json(plan, 200);
}
