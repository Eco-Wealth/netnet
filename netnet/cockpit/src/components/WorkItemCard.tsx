"use client";

import React from "react";

type Props = {
  item: any;
  onOpen?: (id: string) => void;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-700 shadow-sm">
      {children}
    </span>
  );
}

export function WorkItemCard({ item, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(item.id)}
      className="w-full text-left rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{item.title}</div>
          <div className="mt-1 text-xs text-neutral-600 line-clamp-2">
            {item.description || "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge>{item.status}</Badge>
          <Badge>{item.priority}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.owner ? <Badge>Owner: {item.owner}</Badge> : null}
        {Array.isArray(item.tags)
          ? item.tags.slice(0, 6).map((t: string) => <Badge key={t}>#{t}</Badge>)
          : null}
        {item.slaHours ? <Badge>SLA: {item.slaHours}h</Badge> : null}
      </div>

      <div className="mt-3 text-[11px] text-neutral-500">
        Updated {new Date(item.updatedAt).toLocaleString()}
      </div>
    </button>
  );
}
