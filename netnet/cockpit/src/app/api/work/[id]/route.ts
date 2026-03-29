import { NextResponse } from "next/server";
import { getWorkItem } from "@/vealth/work/workStore";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const item = getWorkItem(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}
