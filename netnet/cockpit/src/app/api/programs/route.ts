import { NextResponse } from "next/server";
import { STRATEGY_PROGRAMS } from "@/lib/programs/presets";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, programs: STRATEGY_PROGRAMS });
}
