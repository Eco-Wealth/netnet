import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildLaunchEnvelope, submitLaunchToBankr } from "@/lib/bankr/launcher";

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

export async function GET() {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = LaunchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const { submit, ...proposal } = parsed.data;
  const envelope = buildLaunchEnvelope(proposal);

  if (!submit) return NextResponse.json(envelope);

  try {
    const res = await submitLaunchToBankr(proposal);
    return NextResponse.json({ ...envelope, submitted: true, bankr: res });
  } catch (e: any) {
    return NextResponse.json({ ...envelope, submitted: false, error: e?.message || "submit_failed" }, { status: 502 });
  }
}
