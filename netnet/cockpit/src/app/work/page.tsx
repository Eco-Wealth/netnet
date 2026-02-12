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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-600">Ops Console</div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Work System
          </h1>
          <div className="mt-2 text-sm text-neutral-600">
            Queue + SLA metadata + audit trail. Safe-by-default; execution stays gated elsewhere.
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
          {Object.entries(counts).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-neutral-200 bg-white px-2 py-1 shadow-sm"
            >
              {k}: {v}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">New work item</div>

          <label className="mt-3 block text-xs text-neutral-600">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            placeholder="e.g., Publish proof for weekly retirement"
          />

          <label className="mt-3 block text-xs text-neutral-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            rows={4}
            placeholder="What, why, links, acceptance criteria…"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-neutral-600">Owner</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                placeholder="operator / agent"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-600">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              >
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-600">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                placeholder="comma,separated"
              />
            </div>
          </div>

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

          <div className="mt-4 flex gap-2">
            <button
              onClick={create}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
            >
              Create
            </button>
            <button
              onClick={refresh}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-sm">
              No work items yet.
            </div>
          ) : (
            items.map((it) => <WorkItemCard key={it.id} item={it} />)
          )}
        </div>
      </div>
    </div>
  );
}
