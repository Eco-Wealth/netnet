export type ClarityLevel = "beginner" | "standard" | "pro";

export const CLARITY_DEFAULT: ClarityLevel = "standard";

export function normalizeClarity(v?: string): ClarityLevel {
  if (v === "beginner" || v === "standard" || v === "pro") return v;
  return CLARITY_DEFAULT;
}

export function clarityLabel(level: ClarityLevel): string {
  if (level === "beginner") return "Beginner";
  if (level === "pro") return "Pro";
  return "Standard";
}
