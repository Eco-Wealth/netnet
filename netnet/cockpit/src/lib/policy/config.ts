import type { PolicyConfig } from "./types";
import { getDefaultPolicy } from "./defaultPolicy";

function tryParseJson<T>(s?: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// Override mechanism:
// - NETNET_POLICY_JSON: a full PolicyConfig JSON blob
export function loadPolicyConfig(): PolicyConfig {
  const raw = process.env.NETNET_POLICY_JSON;
  const fromEnv = tryParseJson<PolicyConfig>(raw);
  if (fromEnv && (fromEnv as any).programs) return fromEnv;
  return getDefaultPolicy();
}
