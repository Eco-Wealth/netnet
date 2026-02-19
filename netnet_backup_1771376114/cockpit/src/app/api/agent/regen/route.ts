import { NextRequest, NextResponse } from "next/server";
import { listChains } from "@/lib/chains/registry";
import { newProjectPacketTemplate } from "@/lib/regen/projectTemplate";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = (searchParams.get("action") || "info").toLowerCase();

  if (action === "info") {
    return json({
      ok: true,
      actions: ["info", "template", "chains", "validate"],
      nextAction: "template",
      safety: {
        readOnly: true,
        note: "This endpoint produces planning artifacts and validation only; no registry writes.",
      },
      docs: [
        {
          label: "Regen Network GitHub org",
          url: "https://github.com/regen-network",
        },
      ],
    });
  }

  if (action === "chains") {
    return json({ ok: true, chains: listChains() });
  }

  if (action === "template") {
    return json({ ok: true, packet: newProjectPacketTemplate() });
  }

  if (action === "validate") {
    // GET validation expects a minimal payload in `packet` query param (JSON encoded)
    const packetRaw = searchParams.get("packet");
    if (!packetRaw) {
      return json(
        {
          ok: false,
          error: {
            code: "MISSING_PACKET",
            message: "Provide packet=<urlencoded json> to validate.",
          },
        },
        400
      );
    }

    try {
      const packet = JSON.parse(packetRaw);
      const errors: string[] = [];
      if (packet?.schema !== "netnet.regen.project_packet.v1")
        errors.push("schema must be netnet.regen.project_packet.v1");
      if (!packet?.project?.name) errors.push("project.name required");
      if (!packet?.project?.summary) errors.push("project.summary required");
      if (!packet?.mrv?.approach) errors.push("mrv.approach required");
      return json({ ok: errors.length === 0, errors });
    } catch {
      return json(
        {
          ok: false,
          error: { code: "BAD_JSON", message: "packet is not valid JSON" },
        },
        400
      );
    }
  }

  return json(
    {
      ok: false,
      error: {
        code: "UNKNOWN_ACTION",
        message: `Unknown action: ${action}. Use action=info`,
      },
    },
    400
  );
}
