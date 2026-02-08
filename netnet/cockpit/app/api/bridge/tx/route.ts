import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgeGet } from "@/lib/bridge/client";

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
    return jsonErr(
      res.status || 502,
      "BRIDGE_UPSTREAM_ERROR",
      "Bridge tx lookup failed.",
      { upstreamStatus: res.status, upstreamError: (res as any).error }
    );
  }

  return jsonOk({ data: res.data }, { status: 200 });
}
