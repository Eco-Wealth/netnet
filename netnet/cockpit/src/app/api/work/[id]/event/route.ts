import { NextResponse } from "next/server";
import { addWorkEvent } from "@/vealth/work/workStore";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const data = await request.json();
  const ev = addWorkEvent(id, { type: data.type, message: data.message, actor: data.actor });
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event: ev }, { status: 201 });
}
