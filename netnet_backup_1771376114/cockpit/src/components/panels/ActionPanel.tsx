"use client";

import React from "react";
import { StatusChip } from "@/components/panels/StatusChip";

export function ActionPanel({
  title,
  subtitle,
  status,
  statusTone,
  statusTitle,
  actions,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: "neutral" | "good" | "warn" | "bad" | "info";
  statusTitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
            {status ? (
              <StatusChip label={status} tone={statusTone ?? "neutral"} title={statusTitle} />
            ) : null}
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-white/60">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className="px-3 py-3">{children}</div>

      {footer ? <div className="border-t border-white/10 px-3 py-2">{footer}</div> : null}
    </section>
  );
}
