import { NextResponse } from "next/server";
import { listWorkItems, createWorkItem } from "@/vealth/work/workStore";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const items = listWorkItems({ owner: owner as any, status: status as any });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const data = await request.json();
  const item = createWorkItem({ title: data.title, description: data.description, owner: data.owner, tags: data.tags });
  return NextResponse.json({ item }, { status: 201 });
}
