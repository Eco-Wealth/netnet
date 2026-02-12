import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const HashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "tx hash must be a 0x-prefixed 32-byte hex string");

function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, ...((data as any) ?? {}) }, { status });
}

function err(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

export const runtime = "nodejs";

// GET /api/ecotoken/scan?hash=0x...
// GET /api/ecotoken/scan?chain=base&address=0x...
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hashRaw = url.searchParams.get("hash");
    const chainRaw = url.searchParams.get("chain");
    const addressRaw = url.searchParams.get("address");

    if (chainRaw && addressRaw) {
      const chain = chainRaw.trim().toLowerCase();
      const address = addressRaw.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return err("BAD_REQUEST", "Invalid address format", 400);
      }
      const scanUrl = `https://scan.ecotoken.earth/address/${address.toLowerCase()}?chain=${encodeURIComponent(chain)}`;
      return ok({
        chain,
        address: address.toLowerCase(),
        url: scanUrl,
        instructions:
          "Open the URL to view third-party verification context for this asset address.",
      });
    }

    if (!hashRaw) return err("BAD_REQUEST", "Missing required query param: hash", 400);

    const parsed = HashSchema.safeParse(hashRaw);
    if (!parsed.success) {
      return err("BAD_REQUEST", "Invalid tx hash format", 400, parsed.error.flatten());
    }

    const hash = parsed.data.toLowerCase();
    const scanUrl = `https://scan.ecotoken.earth/tx/${hash}`;

    return ok({
      hash,
      url: scanUrl,
      instructions:
        "Open the URL to view third-party verification context for this transaction. This is supportive evidence, not a guarantee of retirement completion.",
    });
  } catch (e: any) {
    return err("INTERNAL", "Unexpected error", 500, { message: e?.message });
  }
}
