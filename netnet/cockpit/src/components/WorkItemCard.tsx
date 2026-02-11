"use client";

import React from "react";
import { Button } from "@/components/ui";

type Props = {
  item: any;
  onOpen?: (id: string) => void;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-0.5 text-xs text-[color:var(--muted)]">
      {children}
    </span>
  );
}

export function WorkItemCard({ item, onOpen }: Props) {
  return (
    <Button
      type="button"
      onClick={() => onOpen?.(item.id)}
      variant="ghost"
      className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-left transition hover:border-[color:var(--surface-3)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{item.title}</div>
          <div className="mt-1 line-clamp-2 text-xs text-[color:var(--muted)]">
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

      <div className="mt-3 text-[11px] text-[color:var(--muted)]">
        Updated {new Date(item.updatedAt).toLocaleString()}
      </div>
    </Button>
  );
}
