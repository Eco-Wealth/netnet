"use client";

type Json = Record<string, any>;

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const msg = body?.error || body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body as T;
}

export type WorkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkStatus = "PROPOSED" | "READY" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

export type CreateWorkInput = {
  title: string;
  description?: string;
  owner?: string;
  priority?: WorkPriority;
  status?: WorkStatus;
  tags?: string[];
  // free-form fields allowed; server should ignore unknown keys
  [k: string]: any;
};

export type WorkEventInput = {
  type: string;          // e.g. "NOTE" | "ACTION" | "RESULT" | "ERROR"
  by?: string;           // e.g. "agent" | "operator"
  note?: string;         // human-readable
  patch?: Json;          // machine payload (optional)
  [k: string]: any;
};

export async function createWork(input: CreateWorkInput) {
  const out = await jsonFetch<{ ok: boolean; id?: string; item?: any }>(`/api/work`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  // normalize: prefer id field; fall back to item.id
  const id = out.id || out.item?.id;
  return { ...out, id };
}

/**
 * Append an event to a work item.
 * Canonical endpoint: POST /api/work/[id]
 */
export async function appendWorkEvent(workId: string, ev: WorkEventInput) {
  const body = {
    type: ev.type,
    by: ev.by ?? "agent",
    note: ev.note ?? "",
    patch: ev.patch ?? null,
  };

  return jsonFetch<{ ok: boolean; item?: any }>(`/api/work/${encodeURIComponent(workId)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function withWork<T>(
  input: CreateWorkInput,
  run: (workId?: string) => Promise<T>
): Promise<{ workId: string | null; result: T }> {
  let workId: string | null = null;
  try {
    const created = await createWork(input);
    workId = created.id ?? null;
  } catch {
    // Keep caller flow alive in read-only/propose-only mode if work API is unavailable.
    workId = null;
  }

  const result = await run(workId ?? undefined);

  if (workId) {
    try {
      await appendWorkEvent(workId, {
        type: "NOTE",
        by: "agent",
        note: "Action completed.",
        patch: { ok: true },
      });
    } catch {
      // Non-fatal for caller flow.
    }
  }

  return { workId, result };
}
