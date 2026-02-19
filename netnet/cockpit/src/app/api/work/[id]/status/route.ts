import { NextResponse } from "next/server";
import { updateWorkStatus } from "../../../../../vealth/work/workStore";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const data = await request.json();
  const item = updateWorkStatus(id, data.status);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}
