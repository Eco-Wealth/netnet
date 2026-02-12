import { jsonOk } from "@/lib/api/errors";
import { bridgeGet } from "@/lib/bridge/client";
import { upstreamJsonErr } from "@/lib/api/upstream";

export async function GET() {
  const res = await bridgeGet<any>("/v1/registry", undefined, 60_000);

  if (!res.ok) {
    return upstreamJsonErr("bridge.registry", res, "Bridge registry request failed.");
  }

  return jsonOk({ data: res.data, source: "bridge.registry", degraded: false }, { status: 200 });
}
