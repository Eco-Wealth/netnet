"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import type { WorkItem } from "@/lib/work";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data as T;
}

const statusOptions = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const priorityOptions = ["LOW", "MED", "HIGH", "CRIT"] as const;
const kindOptions = ["TASK", "BUG", "RESEARCH", "DOCS"] as const;

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function OpsConsole() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [owner, setOwner] = useState<string>("");

  // create
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof kindOptions)[number]>("TASK");
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>("MED");
  const [slaHours, setSlaHours] = useState<number>(48);
  const [acceptance, setAcceptance] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ ok: true; items: WorkItem[] }>(
        `/api/work?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&owner=${encodeURIComponent(owner)}`
      );
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const byStatus: Record<string, WorkItem[]> = { OPEN: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] };
    for (const it of items) (byStatus[it.status] ||= []).push(it);
    for (const k of Object.keys(byStatus)) {
      byStatus[k].sort((a, b) => (b.priority || "").localeCompare(a.priority || ""));
    }
    return byStatus;
  }, [items]);

  async function createItem() {
    setCreating(true);
    setError(null);
    try {
      await api(`/api/work`, {
        method: "POST",
        body: JSON.stringify({
          title,
          kind,
          priority,
          owner: owner || undefined,
          slaHours,
          acceptance: acceptance || undefined,
        }),
      });
      setTitle("");
      setAcceptance("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function patchItem(id: string, patch: Partial<WorkItem>) {
    setError(null);
    try {
      await api(`/api/work/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    }
  }

  function SLAChip({ item }: { item: WorkItem }) {
    const dueAt = item?.sla?.dueAt ? new Date(item.sla.dueAt) : null;
    const overdue = dueAt ? dueAt.getTime() < Date.now() && item.status !== "DONE" : false;
    return (
      <span
        className={classNames(
          "text-xs rounded-full px-2 py-1 border",
          overdue && "border-red-500/50 text-red-200",
          !overdue && "border-white/15 text-white/70"
        )}
        title={dueAt ? `Due ${dueAt.toLocaleString()}` : "No SLA"}
      >
        {dueAt ? (overdue ? "SLA overdue" : "SLA ok") : "No SLA"}
      </span>
    );
  }

  const Column = ({ label, items }: { label: string; items: WorkItem[] }) => (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold tracking-wide">{label}</div>
        <div className="text-xs text-white/60">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-white/10 bg-black/40 p-3 hover:border-white/20 transition">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{it.title}</div>
                <div className="text-xs text-white/60">
                  {it.kind} • {it.priority} {it.owner ? `• ${it.owner}` : ""}
                </div>
              </div>
              <SLAChip item={it} />
            </div>

            {it.acceptance?.length ? (
              <div className="mt-2 text-xs text-white/70 whitespace-pre-wrap">{it.acceptance}</div>
            ) : null}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <select
                className="text-xs rounded-lg bg-black/40 border border-white/10 px-2 py-1 hover:border-white/20"
                value={it.status}
                onChange={(e) => patchItem(it.id, { status: e.target.value as any })}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="text-xs rounded-lg bg-black/40 border border-white/10 px-2 py-1 hover:border-white/20"
                value={it.priority}
                onChange={(e) => patchItem(it.id, { priority: e.target.value as any })}
              >
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <Input
                className="text-xs w-40"
                placeholder="owner"
                value={it.owner || ""}
                onChange={(e) => patchItem(it.id, { owner: e.target.value })}
              />
              <Button size="sm" variant="ghost" onClick={() => patchItem(it.id, { status: "IN_PROGRESS" as any })}>
                Start
              </Button>
              <Button size="sm" variant="ghost" onClick={() => patchItem(it.id, { status: "DONE" as any })}>
                Done
              </Button>
            </div>
          </div>
        ))}
        {!items.length ? <div className="text-xs text-white/50">No items</div> : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-semibold">Ops Console</div>
            <div className="text-sm text-white/60">Queue, SLAs, owners, approvals. Safe-by-default.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select
            className="text-sm rounded-xl bg-black/40 border border-white/10 px-3 py-2 hover:border-white/20"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input placeholder="owner (filter + default)" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={load} disabled={loading}>
            Apply filters
          </Button>
          <Button variant="ghost" onClick={() => { setQ(""); setStatus(""); setOwner(""); }} disabled={loading}>
            Clear
          </Button>
        </div>

        {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-base font-semibold">Create work</div>
            <div className="text-sm text-white/60">Creates a work item with SLA + acceptance criteria.</div>
          </div>
          <Button onClick={createItem} disabled={creating || !title.trim()}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            placeholder="SLA hours"
            type="number"
            value={slaHours}
            onChange={(e) => setSlaHours(Number(e.target.value || 0))}
          />
          <select
            className="text-sm rounded-xl bg-black/40 border border-white/10 px-3 py-2 hover:border-white/20"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
          >
            {kindOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className="text-sm rounded-xl bg-black/40 border border-white/10 px-3 py-2 hover:border-white/20"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3">
          <Textarea
            placeholder="Acceptance criteria (what 'done' means)"
            value={acceptance}
            onChange={(e) => setAcceptance(e.target.value)}
          />
        </div>
      </div>

      {loading ? <div className="text-sm text-white/60">Loading…</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Column label="Open" items={grouped.OPEN || []} />
        <Column label="In progress" items={grouped.IN_PROGRESS || []} />
        <Column label="Blocked" items={grouped.BLOCKED || []} />
        <Column label="Done" items={grouped.DONE || []} />
      </div>
    </div>
  );
}
