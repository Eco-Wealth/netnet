export type OperatorLayoutMode = "twoPane" | "fourPane";

export const DEFAULT_OPERATOR_LAYOUT: OperatorLayoutMode = "twoPane";
const STORAGE_KEY = "nn.operator.layoutMode";

function isLayoutMode(value: unknown): value is OperatorLayoutMode {
  return value === "twoPane" || value === "fourPane";
}

export function loadOperatorLayout(): OperatorLayoutMode {
  if (typeof window === "undefined") return DEFAULT_OPERATOR_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPERATOR_LAYOUT;
    return isLayoutMode(raw) ? raw : DEFAULT_OPERATOR_LAYOUT;
  } catch {
    return DEFAULT_OPERATOR_LAYOUT;
  }
}

export function saveOperatorLayout(mode: OperatorLayoutMode): void {
  if (typeof window === "undefined") return;
  try {
    if (isLayoutMode(mode)) window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // noop: local storage may be unavailable in strict browser contexts
  }
}
