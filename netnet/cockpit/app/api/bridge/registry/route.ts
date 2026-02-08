import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgeGet } from "@/lib/bridge/client";

export async function GET() {
  const res = await bridgeGet<any>("/v1/registry", undefined, 60_000);

  if (!res.ok) {
    return jsonErr(
      res.status || 502,
      "BRIDGE_UPSTREAM_ERROR",
      "Bridge registry request failed.",
      { upstreamStatus: res.status, upstreamError: String((res as any).error ?? "") }
    );
  }

  return jsonOk({ data: res.data }, { status: 200 });
}
