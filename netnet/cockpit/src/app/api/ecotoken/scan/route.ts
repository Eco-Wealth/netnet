import { NextRequest, NextResponse } from "next/server";

function isTxHash(hash: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

function isEvmAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/**
 * Unit E — Scan/Asset Contract Clarification
 *
 * Canonical contract:
 * - Preferred for asset workspaces: /api/ecotoken/scan?chain=base&address=0x...
 * - Also supports tx scanning: /api/ecotoken/scan?hash=0x...
 *
 * Returns:
 *  { ok, kind: "asset" | "tx", url, instructions, input: {...} }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const hashRaw = (url.searchParams.get("hash") || "").trim();
  const chainRaw = (url.searchParams.get("chain") || "").trim().toLowerCase();
  const addressRaw = (url.searchParams.get("address") || "").trim();

  // Branch 1: tx hash scan
  if (hashRaw) {
    if (!isTxHash(hashRaw)) {
      return NextResponse.json(
        { ok: false, error: "Invalid hash. Expected 0x + 64 hex chars." },
        { status: 400 }
      );
    }

    const scanUrl = `https://scan.ecotoken.earth/tx/${hashRaw}`;
    return NextResponse.json({
      ok: true,
      kind: "tx",
      url: scanUrl,
      input: { hash: hashRaw },
      instructions:
        "Open the scan link. Verify chain, token movements, and receipts. If this tx is part of a retirement, attach the scan URL to the proof/work item.",
    });
  }

  // Branch 2: asset scan by chain+address
  if (!chainRaw || !addressRaw) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing query params. Provide either `hash` OR (`chain` AND `address`).",
      },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9-]{2,32}$/.test(chainRaw)) {
    return NextResponse.json(
      { ok: false, error: "Invalid chain. Use a short lowercase id (e.g. base)." },
      { status: 400 }
    );
  }

  if (!isEvmAddress(addressRaw)) {
    return NextResponse.json(
      { ok: false, error: "Invalid address. Expected 0x + 40 hex chars." },
      { status: 400 }
    );
  }

  const scanUrl = `https://scan.ecotoken.earth/${chainRaw}/${addressRaw}`;
  return NextResponse.json({
    ok: true,
    kind: "asset",
    url: scanUrl,
    input: { chain: chainRaw, address: addressRaw },
    instructions:
      "Open the scan link. Review contract/account activity and receipts. Use this when you want to audit an address or token contract; attach the URL to a work item for traceability.",
  });
}
