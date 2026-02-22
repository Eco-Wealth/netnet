"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { WorkItemCard } from "@/components/WorkItemCard";

type WorkItem = any;

type WorkFilters = {
  q?: string;
  hasProof?: boolean;
  proofId?: string;
};

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
  const [listQuery, setListQuery] = useState("");
  const [proofOnly, setProofOnly] = useState(false);
  const [proofIdFilter, setProofIdFilter] = useState("");

  function normalizeFilters(filters?: WorkFilters): Required<WorkFilters> {
    return {
      q: (filters?.q ?? listQuery).trim(),
      hasProof: filters?.hasProof ?? proofOnly,
      proofId: (filters?.proofId ?? proofIdFilter).trim(),
    };
  }

  function writeFiltersToUrl(filters: Required<WorkFilters>) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.hasProof) params.set("hasProof", "1");
    if (filters.proofId) params.set("proofId", filters.proofId);
    const suffix = params.toString();
    const next = suffix ? `/work?${suffix}` : "/work";
    window.history.replaceState({}, "", next);
  }

  async function refresh(filters?: WorkFilters) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const normalized = normalizeFilters(filters);
      const { q, hasProof, proofId } = normalized;

      if (q) params.set("q", q);
      if (hasProof) params.set("hasProof", "1");
      if (proofId) params.set("proofId", proofId);

      const suffix = params.toString();
      const path = suffix ? `/api/work?${suffix}` : "/api/work";
      const data = await api<{ ok: true; items: WorkItem[] }>(path);
      setItems(data.items || []);
      writeFiltersToUrl(normalized);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      refresh();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const initialQ = (params.get("q") || "").trim();
    const initialProofId = (params.get("proofId") || "").trim();
    const hasProofRaw = (params.get("hasProof") || "").toLowerCase().trim();
    const initialProofOnly =
      hasProofRaw === "1" || hasProofRaw === "true" || hasProofRaw === "yes";

    if (initialQ) setListQuery(initialQ);
    if (initialProofId) setProofIdFilter(initialProofId);
    if (initialProofOnly) setProofOnly(true);

    const initialFilters: WorkFilters = {
      q: initialQ,
      proofId: initialProofId,
      hasProof: initialProofOnly,
    };
    refresh(initialFilters);
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

  function applyFilters() {
    refresh();
  }

  function clearFilters() {
    setListQuery("");
    setProofIdFilter("");
    setProofOnly(false);
    refresh({ q: "", proofId: "", hasProof: false });
  }

  function onFilterKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyFilters();
    }
  }

  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Work"
        subtitle="Queue tasks, assign ownership, and track status."
        guidance="Create an item with title + owner, then move it through status until complete."
        outputs="Produces: work item records, status history, and task metadata for operator follow-up."
      />

      <div className="nn-surface">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
          <label className="grid gap-1">
            <span className="text-xs text-white/70">Search</span>
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              onKeyDown={onFilterKeyDown}
              className="h-10 rounded-[11px] border border-white/15 bg-white/[0.04] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
              placeholder="title, tag, proof id, verify url"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/70">Proof ID filter</span>
            <input
              value={proofIdFilter}
              onChange={(e) => setProofIdFilter(e.target.value)}
              onKeyDown={onFilterKeyDown}
              className="h-10 rounded-[11px] border border-white/15 bg-white/[0.04] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/15"
              placeholder="proof hash or prefix"
            />
          </label>

          <label className="inline-flex h-10 items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={proofOnly}
              onChange={(e) => setProofOnly(e.target.checked)}
            />
            Proof-linked only
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="rounded-[11px] border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.11]"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="rounded-[11px] border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/[0.09]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

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
              Create Work Item
            </button>
            <button
              onClick={() => refresh()}
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
