import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgePost, getBridgeConfig } from "@/lib/bridge/client";

const Body = z.object({
  projectId: z.string().min(1),
  amount: z.number().positive(),
  chain: z.string().min(1).default("base"),
  token: z.string().min(1).default("USDC"),
  beneficiaryName: z.string().min(1),
  reason: z.string().min(1),
  // Optional: allow clients to pass a reference for linking proof objects
  clientRef: z.string().optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonErr(400, "INVALID_JSON", "Request body must be JSON.");
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return jsonErr(400, "INVALID_BODY", "Invalid request body.", parsed.error.flatten());
  }

  const cfg = getBridgeConfig();
  const res = await bridgePost<any>("/v1/retire", parsed.data);

  if (!res.ok) {
    return jsonErr(
      res.status || 502,
      "BRIDGE_UPSTREAM_ERROR",
      "Bridge retire request failed.",
      { upstreamStatus: res.status, upstreamError: (res as any).error }
    );
  }

  // Expected shape: payment instructions + retirement reference (depends on Bridge).
  return jsonOk({ data: res.data, bridgeBaseUrl: cfg.baseUrl }, { status: 200 });
}
