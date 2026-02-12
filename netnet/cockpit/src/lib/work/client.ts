// Unit 41 — Skill→Work integration (client helper)
// This module only uses the Work API; it does not assume any specific storage backend.
// Safe-by-default: all functions fail soft (return null/false) so actions never break UX.

export type WorkKind =
  | "CARBON_RETIRE"
  | "TRADE_PLAN"
  | "TOKEN_OPS"
  | "PROOF"
  | "OPS"
  | "OTHER";

export type WorkCreateInput = {
  title: string;
  kind?: WorkKind;
  tags?: string[];
  meta?: Record<string, unknown>;
};

export type WorkEventInput = {
  type: "START" | "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  data?: Record<string, unknown>;
};

type RouteEventType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "COMMENT"
  | "APPROVAL_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED";

function toRouteEventType(input: WorkEventInput["type"]): RouteEventType {
  if (input === "WARN") return "ESCALATED";
  if (input === "ERROR") return "REJECTED";
  if (input === "SUCCESS") return "APPROVED";
  return "COMMENT";
}

async function jsonFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function createWork(input: WorkCreateInput): Promise<string | null> {
  const out = await jsonFetch<{ ok: boolean; item?: { id?: string } }>(`/api/work`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      tags: input.tags,
      description: input.meta ? JSON.stringify(input.meta) : undefined,
    }),
  });
  return out?.ok && out.item?.id ? out.item.id : null;
}

export async function appendWorkEvent(
  workId: string,
  ev: WorkEventInput
): Promise<boolean> {
  const out = await jsonFetch<{ ok: boolean }>(`/api/work/${encodeURIComponent(workId)}`, {
    method: "POST",
    body: JSON.stringify({
      type: toRouteEventType(ev.type),
      note: ev.message,
      patch: ev.data,
    }),
  });
  return !!out?.ok;
}

export async function withWork<T>(
  create: WorkCreateInput,
  run: (workId: string | null) => Promise<T>
): Promise<{ workId: string | null; result: T }> {
  const workId = await createWork(create);
  if (workId) {
    await appendWorkEvent(workId, { type: "START", message: "Action started" });
  }
  try {
    const result = await run(workId);
    if (workId) {
      await appendWorkEvent(workId, { type: "SUCCESS", message: "Action completed" });
    }
    return { workId, result };
  } catch (e: any) {
    if (workId) {
      await appendWorkEvent(workId, {
        type: "ERROR",
        message: e?.message ? String(e.message) : "Action failed",
      });
    }
    throw e;
  }
}
