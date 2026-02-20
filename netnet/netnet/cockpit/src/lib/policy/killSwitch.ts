export type KillSwitchMode = "ALL" | "SPEND";

/**
 * NETNET_KILL_SWITCH=1 blocks guarded endpoints (agent surfaces).
 * NETNET_SPEND_KILL_SWITCH=1 blocks any endpoint that could lead to value movement.
 */
export function isKilled(mode: KillSwitchMode): boolean {
  const killAll = process.env.NETNET_KILL_SWITCH === "1";
  if (killAll) return true;
  if (mode === "SPEND") return process.env.NETNET_SPEND_KILL_SWITCH === "1";
  return false;
}

export function killReason(mode: KillSwitchMode): string {
  if (process.env.NETNET_KILL_SWITCH === "1") return "NETNET_KILL_SWITCH";
  if (mode === "SPEND" && process.env.NETNET_SPEND_KILL_SWITCH === "1") return "NETNET_SPEND_KILL_SWITCH";
  return "UNKNOWN_KILL_SWITCH";
}
