"use client";

import React, { useEffect, useMemo, useState } from "react";
import { WorkItemCard } from "@/components/WorkItemCard";

type WorkItem = any;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data as T;
}

export default function WorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [tags, setTags] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ ok: true; items: WorkItem[] }>("/api/work");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create() {
    setError(null);
    const t = title.trim();
    if (!t) return setError("Title required");
    try {
      await api("/api/work", {
        method: "POST",
        body: JSON.stringify({
          title: t,
          description: description.trim() || undefined,
          owner: owner.trim() || undefined,
          priority,
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          actor: "operator",
        }),
      });
      setTitle("");
      setDescription("");
      setOwner("");
      setTags("");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.status] = (c[it.status] || 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="nn-page-stack">
      <header className="nn-page-header">
        <div className="nn-page-kicker">Ops Console</div>
        <h1>Work System</h1>
        <p className="nn-page-lead">
          Queue, SLA metadata, and audit trail. Execution remains policy-gated.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(counts).map(([k, v]) => (
          <span
            key={k}
            className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-white/80"
          >
            {k}: {v}
          </span>
        ))}
      </div>

      <div className="nn-grid-2">
        <div className="nn-surface">
          <h3>New work item</h3>
          <label className="mt-3 block text-xs text-white/70">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
            placeholder="e.g., Publish proof for weekly retirement"
          />

          <label className="mt-3 block text-xs text-white/70">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
            rows={4}
            placeholder="What, why, links, acceptance criteria"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-white/70">Owner</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
                placeholder="operator / agent"
              />
            </div>

            <div>
              <label className="block text-xs text-white/70">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
              >
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/70">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1 w-full rounded-[11px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
                placeholder="comma,separated"
              />
            </div>
          </div>

          {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

          <div className="mt-4 flex gap-2">
            <button
              onClick={create}
              className="rounded-[11px] border border-white/15 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-100"
            >
              Create
            </button>
            <button
              onClick={refresh}
              className="rounded-[11px] border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.11]"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {loading ? (
            <div className="nn-surface text-sm text-white/75">Loading...</div>
          ) : items.length === 0 ? (
            <div className="nn-surface text-sm text-white/75">No work items yet.</div>
          ) : (
            items.map((it) => <WorkItemCard key={it.id} item={it} />)
          )}
        </div>
      </div>
    </div>
  );
}
