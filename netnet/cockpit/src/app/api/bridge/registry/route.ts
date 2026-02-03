import { NextResponse } from "next/server";
import { fetchRegistry } from "@/lib/bridge";

export async function GET() {
  try {
    const data = await fetchRegistry();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 502 });
  }
}
