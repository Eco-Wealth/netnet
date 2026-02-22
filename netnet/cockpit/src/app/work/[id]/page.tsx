"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

type WorkStatus = "NEW" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

type WorkEvent = {
  id: string;
  type: string;
  at: string;
  by: string;
  note?: string;
  patch?: Record<string, unknown>;
};

type WorkItem = {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  tags?: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: WorkStatus;
  createdAt: string;
  updatedAt: string;
  acceptanceCriteria?: string;
  escalationPolicy?: string;
  events: WorkEvent[];
};

const STATUS_TRANSITIONS: Record<WorkStatus, WorkStatus[]> = {
  NEW: ["IN_PROGRESS", "BLOCKED", "CANCELED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "CANCELED"],
  BLOCKED: ["IN_PROGRESS", "CANCELED"],
  DONE: [],
  CANCELED: [],
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

function formatDate(input: string): string {
  const ts = Date.parse(input);
  if (!Number.isFinite(ts)) return input;
  return new Date(ts).toLocaleString();
}

export default function WorkDetailPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = String(params?.id || "").trim();

  const [item, setItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api<{ ok: boolean; item: WorkItem }>(`/api/work/${id}`);
      setItem(result.item);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load work item.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const nextStatuses = useMemo<WorkStatus[]>(
    () => (item ? STATUS_TRANSITIONS[item.status] || [] : []),
    [item]
  );

  async function transitionTo(status: WorkStatus) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ ok: boolean; item: WorkItem }>(`/api/work/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          actor: "operator",
          note: note.trim() || `status -> ${status}`,
        }),
      });
      setItem(result.item);
      setNote("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if (!id || !note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ ok: boolean; item: WorkItem }>(`/api/work/${id}/events`, {
        method: "POST",
        body: JSON.stringify({
          type: "COMMENT",
          by: "operator",
          note: note.trim(),
        }),
      });
      setItem(result.item);
      setNote("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Comment failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <div className="nn-page-stack">
        <PageHeader title="Work detail" subtitle="Invalid work id." />
      </div>
    );
  }

  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Work Detail"
        subtitle={item ? item.title : "Load work item details and move status deterministically."}
        guidance="Review the item, add notes, and move status with explicit transitions."
        outputs="Produces: status change events and comment history for operator audit."
      />

      <div className="flex items-center gap-2 text-sm text-white/75">
        <button
          type="button"
          onClick={() => router.push("/work")}
          className="rounded-[11px] border border-white/15 bg-white/[0.05] px-3 py-1.5 text-white hover:bg-white/[0.1]"
        >
          Back to work
        </button>
        <Link
          href={`/api/work/${id}`}
          className="rounded-[11px] border border-white/15 bg-white/[0.03] px-3 py-1.5 text-white/80 hover:bg-white/[0.09]"
        >
          Open JSON
        </Link>
      </div>

      {loading ? (
        <div className="nn-surface text-sm text-white/75">Loading...</div>
      ) : !item ? (
        <div className="nn-surface text-sm text-red-200">
          {error || "Work item not found."}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="nn-surface">
            <h3>{item.title}</h3>
            <p className="mt-2 text-sm text-white/80">{item.description || "No description."}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1">
                status: {item.status}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1">
                priority: {item.priority}
              </span>
              {item.owner ? (
                <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1">
                  owner: {item.owner}
                </span>
              ) : null}
              {(item.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-white/80"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-3 space-y-1 text-xs text-white/70">
              <div>created: {formatDate(item.createdAt)}</div>
              <div>updated: {formatDate(item.updatedAt)}</div>
              {item.acceptanceCriteria ? <div>acceptance: {item.acceptanceCriteria}</div> : null}
              {item.escalationPolicy ? <div>escalation: {item.escalationPolicy}</div> : null}
            </div>

            <label className="mt-4 block text-xs text-white/70">Operator note</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
              placeholder="Add a transition note or comment"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => transitionTo(status)}
                  disabled={busy}
                  className="rounded-[11px] border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm text-white hover:bg-white/[0.11] disabled:opacity-50"
                >
                  Mark {status}
                </button>
              ))}
              <button
                type="button"
                onClick={addComment}
                disabled={busy || !note.trim()}
                className="rounded-[11px] border border-white/15 bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-100 disabled:opacity-50"
              >
                Add comment
              </button>
            </div>

            {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
          </section>

          <section className="nn-surface">
            <h3>Event history</h3>
            {item.events.length === 0 ? (
              <div className="mt-2 text-sm text-white/70">No events yet.</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {[...item.events]
                  .slice()
                  .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[11px] border border-white/15 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                        <span>{event.type}</span>
                        <span>{formatDate(event.at)}</span>
                      </div>
                      <div className="mt-1 text-sm text-white/90">{event.note || "—"}</div>
                      <div className="mt-1 text-[11px] text-white/60">by {event.by}</div>
                      {event.patch && Object.keys(event.patch).length > 0 ? (
                        <pre className="mt-2 max-h-36 overflow-auto rounded-[8px] border border-white/10 bg-black/40 p-2 text-[11px] text-white/80">
                          {JSON.stringify(event.patch, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
