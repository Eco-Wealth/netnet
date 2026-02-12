import { z } from "zod";
import { jsonErr, jsonOk } from "@/lib/api/errors";
import { bridgePost, getBridgeConfig } from "@/lib/bridge/client";
import { upstreamJsonErr } from "@/lib/api/upstream";

const Body = z.object({
  projectId: z.string().min(1),
  amount: z.number().positive(),
  chain: z.string().min(1).default("base"),
  token: z.string().min(1).default("USDC"),
  beneficiaryName: z.string().min(1).optional(),
  beneficiaryAddress: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
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

  const res = await bridgePost<any>("/v1/quote", parsed.data);

  if (!res.ok) {
    return upstreamJsonErr("bridge.quote", res, "Bridge quote request failed.");
  }

  // Attach pay-to if known/configured at our layer (useful for UI).
  return jsonOk(
    {
      data: res.data,
      payTo: process.env.X402_PAY_TO || null,
      bridgeBaseUrl: cfg.baseUrl,
      source: "bridge.quote",
      degraded: false,
    },
    { status: 200 }
  );
}
