import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLaunchEnvelope, submitLaunchToBankr } from "@/lib/bankr/launcher";
import { withRequestId } from "@/lib/http/errors";
import { enforcePolicy } from "@/lib/policy/enforce";

const LaunchSchema = z.object({
  name: z.string().min(2),
  symbol: z.string().min(2).max(10),
  chain: z.string().min(2),
  description: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
  imageUrl: z.string().optional(),
  submit: z.boolean().optional().default(false),
});

export const GET = withRequestId(async () => {
  const gate = enforcePolicy("token.launch", {
    route: "/api/bankr/launch",
    venue: "bankr",
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "PROPOSE_ONLY",
    requiresApproval: true,
    env: { BANKR_API_BASE_URL: Boolean(process.env.BANKR_API_BASE_URL) },
    example: {
      name: "EcoWealth",
      symbol: "ECO",
      chain: "base",
      submit: false,
    },
  });
});

export const POST = withRequestId(async (req) => {
  const body = await req.json().catch(() => ({}));
  const parsed = LaunchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const { submit, ...proposal } = parsed.data;
  const gate = enforcePolicy("token.launch", {
    route: "/api/bankr/launch",
    chain: proposal.chain,
    venue: "bankr",
    toToken: proposal.symbol,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Policy blocked", details: gate.reasons },
      { status: 403 }
    );
  }

  const envelope = buildLaunchEnvelope(proposal);

  if (!submit) return NextResponse.json(envelope);

  try {
    const res = await submitLaunchToBankr(proposal);
    return NextResponse.json({ ...envelope, submitted: true, bankr: res });
  } catch (e: any) {
    return NextResponse.json({ ...envelope, submitted: false, error: e?.message || "submit_failed" }, { status: 502 });
  }
});
