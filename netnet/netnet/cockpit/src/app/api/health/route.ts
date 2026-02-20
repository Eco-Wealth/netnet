import { NextRequest } from "next/server";
import { withObsJson } from "@/lib/obs";

export async function GET(req: NextRequest) {
  return withObsJson(req, "/api/health", { ok: true, service: "netnet-cockpit" });
}
