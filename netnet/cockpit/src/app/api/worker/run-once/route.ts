import { NextResponse } from "next/server";
import { runWorkerOnce } from "../../../../vealth/worker/workerLoop";

export async function POST() {
  const result = await runWorkerOnce();
  return NextResponse.json({ result });
}
