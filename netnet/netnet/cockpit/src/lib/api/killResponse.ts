import { NextResponse } from "next/server";
import { killReason, KillSwitchMode } from "../policy/killSwitch";

export function killed(mode: KillSwitchMode) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "KILL_SWITCH",
        message: "Agent execution is disabled by operator kill switch.",
        reason: killReason(mode),
      },
    },
    { status: 503 },
  );
}
