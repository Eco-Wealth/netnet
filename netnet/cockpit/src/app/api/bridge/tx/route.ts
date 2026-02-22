import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgeGet } from "@/lib/bridge/client";
import { upstreamJsonErr } from "@/lib/api/upstream";

const Query = z.object({
  hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ hash: url.searchParams.get("hash") ?? "" });

  if (!parsed.success) {
    return jsonErr(400, "INVALID_HASH", "Invalid tx hash. Expected 0x + 64 hex chars.", parsed.error.flatten());
  }

  const res = await bridgeGet<any>("/v1/tx", { hash: parsed.data.hash }, 0);

  if (!res.ok) {
    return upstreamJsonErr("bridge.tx", res, "Bridge tx lookup failed.");
  }

  return jsonOk({ data: res.data, source: "bridge.tx", degraded: false }, { status: 200 });
}
