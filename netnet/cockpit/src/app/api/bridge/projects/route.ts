import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgeGet } from "@/lib/bridge/client";
import { upstreamJsonErr } from "@/lib/api/upstream";

const Query = z.object({
  type: z.string().optional(),
  chain: z.string().optional(),
  token: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    chain: url.searchParams.get("chain") ?? undefined,
    token: url.searchParams.get("token") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return jsonErr(400, "INVALID_QUERY", "Invalid query params.", parsed.error.flatten());
  }

  const res = await bridgeGet<any>("/v1/projects", parsed.data, 60_000);

  if (!res.ok) {
    return upstreamJsonErr("bridge.projects", res, "Bridge projects request failed.");
  }

  return jsonOk({ data: res.data, source: "bridge.projects", degraded: false }, { status: 200 });
}
