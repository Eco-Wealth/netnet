import { NextRequest } from "next/server";
import { MEGAETH, megaethExplorerTx, megaethExplorerAddress, megaethReady } from "@/lib/megaeth";

export const runtime = "nodejs";

/**
 * GET /api/agent/megaeth
 *
 * actions:
 * - action=info (default): readiness + chain metadata
 * - action=chains: chain metadata only
 * - action=explorer&tx=0x.. : tx explorer link
 * - action=explorer&address=0x.. : address explorer link
 *
 * Read-only by design. No signing, no key material, no on-chain calls.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "info").toLowerCase();

  if (action === "chains") {
    return Response.json({
      ok: true,
      chain: MEGAETH,
    });
  }

  if (action === "explorer") {
    const tx = url.searchParams.get("tx");
    const address = url.searchParams.get("address");

    if (tx) {
      const link = megaethExplorerTx(tx);
      return Response.json({ ok: true, kind: "tx", tx, link });
    }
    if (address) {
      const link = megaethExplorerAddress(address);
      return Response.json({ ok: true, kind: "address", address, link });
    }

    return Response.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Provide tx or address" } },
      { status: 400 }
    );
  }

  // default: info
  const readiness = megaethReady();
  return Response.json({
    ok: true,
    actions: ["info", "chains", "explorer"],
    readiness,
    chain: MEGAETH,
    nextAction: "Try action=chains or action=explorer&tx=0x...",
    safety: {
      mode: "READ_ONLY",
      note: "Unit 54 intentionally does not execute transactions or store keys.",
    },
  });
}
