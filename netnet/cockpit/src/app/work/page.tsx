"use client";

import React, { useEffect, useMemo, useState } from "react";
import { WorkItemCard } from "@/components/WorkItemCard";
import { Button, Input, Label, TextArea } from "@/components/ui";

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
    <div className="nn-page max-w-5xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Ops Console</div>
          <h1 className="nn-page-title">
            Work System
          </h1>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Queue + SLA metadata + audit trail. Safe-by-default; execution stays gated elsewhere.
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
          {Object.entries(counts).map(([k, v]) => (
            <span
              key={k}
              className="nn-chip"
            >
              {k}: {v}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="nn-panel p-4">
          <div className="text-sm font-semibold">New work item</div>

          <Label className="mt-3 block">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            placeholder="e.g., Publish proof for weekly retirement"
          />

          <Label className="mt-3 block">Description</Label>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={4}
            placeholder="What, why, links, acceptance criteria…"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="block">Owner</Label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="mt-1"
                placeholder="operator / agent"
              />
            </div>

            <div>
              <Label className="block">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="nn-input nn-focus mt-1 w-full"
              >
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </div>

            <div>
              <Label className="block">Tags</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1"
                placeholder="comma,separated"
              />
            </div>
          </div>

          {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

          <div className="mt-4 flex gap-2">
            <Button
              onClick={create}
              insight={{
                what: "Create a new work item in the operator queue.",
                when: "After title, owner, and acceptance context are entered.",
                requires: "Operator intent and policy-compliant scope. No fund movement; API write only.",
                output: "Persisted work item with metadata and timeline support.",
              }}
            >
              Create
            </Button>
            <Button
              variant="ghost"
              onClick={refresh}
              insight={{
                what: "Refresh work items from the backend.",
                when: "After create/update activity or before handoff.",
                requires: "No approval. Read-only API call.",
                output: "Latest work queue state.",
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--muted)]">
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
