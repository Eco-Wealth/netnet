export type AgentIdentity = {
  displayName: string;
  wallet: string;
  profileUrl: string;
};

const KEY = "netnet.agentIdentity.v1";

export const defaultIdentity: AgentIdentity = {
  displayName: "",
  wallet: "",
  profileUrl: "",
};

export function loadAgentIdentity(): AgentIdentity {
  if (typeof window === "undefined") return defaultIdentity;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultIdentity;
    const parsed = JSON.parse(raw);
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      wallet: typeof parsed.wallet === "string" ? parsed.wallet : "",
      profileUrl: typeof parsed.profileUrl === "string" ? parsed.profileUrl : "",
    };
  } catch {
    return defaultIdentity;
  }
}

export function saveAgentIdentity(next: AgentIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
