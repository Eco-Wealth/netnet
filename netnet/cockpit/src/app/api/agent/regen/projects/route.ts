import { NextResponse } from "next/server";
import { buildRegenProjectPacket, type RegenProjectRequest } from "@/lib/regen/projectPacket";

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "info";

  if (action !== "info") {
    return json<ApiErr>(
      { ok: false, error: { code: "BAD_ACTION", message: "Use action=info" } },
      400
    );
  }

  const body: ApiOk<{
    actions: ("info" | "generate")[];
    nextAction: "generate";
    safety: { mode: "PROPOSAL_ONLY"; note: string };
    input: {
      method: "POST";
      path: "/api/agent/regen/projects";
      example: RegenProjectRequest;
    };
  }> = {
    ok: true,
    actions: ["info", "generate"],
    nextAction: "generate",
    safety: {
      mode: "PROPOSAL_ONLY",
      note: "Generates a Regen registry project packet; does not submit or mutate registry state.",
    },
    input: {
      method: "POST",
      path: "/api/agent/regen/projects",
      example: {
        title: "Watershed restoration for municipal water district",
        summary:
          "Riparian restoration + erosion control to reduce turbidity and protect reservoirs.",
        buyerClass: "water_district",
        buyerName: "Example Water District",
        buyerMandate: "Reduce treatment costs; meet watershed protection obligations.",
        country: "USA",
        region: "California",
        methodology: "Regen methodology TBD (proposal-only)",
        mrvAssumptions: [
          "Land control is secured via contract/lease.",
          "Baseline defined using historical imagery and sampling.",
        ],
        requiredFields: ["land_control", "project_boundary", "baseline", "monitoring_plan"],
        cadence: "Quarterly monitoring; annual verification.",
        confidence: "medium",
        nextSteps: [
          "Confirm land control and boundary geometry.",
          "Select/confirm methodology and eligible credit class.",
          "Draft monitoring plan and MRV budget.",
        ],
      },
    },
  };

  return json(body);
}

export async function POST(req: Request) {
  let input: RegenProjectRequest;
  try {
    input = (await req.json()) as RegenProjectRequest;
  } catch {
    return json<ApiErr>(
      { ok: false, error: { code: "BAD_JSON", message: "Invalid JSON body" } },
      400
    );
  }

  const title = (input.title ?? "").trim();
  const summary = (input.summary ?? "").trim();

  if (!title || !summary) {
    return json<ApiErr>(
      {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "title and summary are required",
          details: { required: ["title", "summary"] },
        },
      },
      400
    );
  }

  const packet = buildRegenProjectPacket(input);

  // Proposal-only proof object for downstream logging/sharing
  const proof = {
    schema: "netnet.proof.v1",
    kind: "regen_project_packet",
    ts: new Date().toISOString(),
    subject: {
      agentId: (input.agentId ?? "agent").toString(),
      wallet: input.wallet ?? "",
      operator: input.operator ?? "",
    },
    refs: {
      url: input.url ?? "",
    },
    why: (input.why ?? "proposal-only registry project packet").toString(),
    data: {
      packet,
    },
  };

  return json({ ok: true, packet, proof });
}
