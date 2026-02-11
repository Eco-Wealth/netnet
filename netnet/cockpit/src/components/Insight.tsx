"use client";

import * as React from "react";
import type { InsightFields } from "@/lib/insight";
import { toInsightTitle } from "@/lib/insight";

/**
 * Canonical insight helper.
 * Single contract: { what, when?, requires?, output? }.
 */
export function Insight({
  insight,
  children,
  className = "",
}: {
  insight: InsightFields;
  children: React.ReactNode;
  className?: string;
}) {
  const title = toInsightTitle(insight);

  return (
    <span className={["relative inline-flex items-center", className].join(" ")}>
      <span className="group inline-flex items-center gap-1" title={title}>
        <span className="inline-flex items-center gap-1">{children}</span>
        <span className="hidden md:pointer-events-none md:absolute md:right-0 md:top-full md:z-40 md:mt-2 md:min-w-[16rem] md:max-w-[22rem] md:rounded-[var(--r-md)] md:border md:border-[color:var(--border)] md:bg-[hsl(var(--panel2))] md:p-2 md:text-[11px] md:leading-snug md:text-[color:var(--fg)] md:shadow-lg md:group-hover:block md:group-focus-within:block">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">What</div>
          <div className="mt-0.5">{insight.what}</div>
          {insight.when ? (
            <>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">When</div>
              <div className="mt-0.5">{insight.when}</div>
            </>
          ) : null}
          {insight.requires ? (
            <>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">Requires</div>
              <div className="mt-0.5">{insight.requires}</div>
            </>
          ) : null}
          {insight.output ? (
            <>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">Output</div>
              <div className="mt-0.5">{insight.output}</div>
            </>
          ) : null}
        </span>
      </span>
      <span className="sr-only">{title}</span>
    </span>
  );
}
