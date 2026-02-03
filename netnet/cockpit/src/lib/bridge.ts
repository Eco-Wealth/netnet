import { BRIDGE_ECO_API_BASE } from "@/lib/env";

export async function fetchRegistry() {
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/registry`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Bridge.eco /registry failed: ${res.status}`);
  return res.json();
}

export async function fetchTx(txHash: string) {
  const clean = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  const res = await fetch(`${BRIDGE_ECO_API_BASE}/transactions/${clean}`, {
    cache: "no-store",
  });
  if (res.status === 404) return { error: "NOT_FOUND" as const };
  if (!res.ok) throw new Error(`Bridge.eco /transactions/{hash} failed: ${res.status}`);
  return res.json();
}
