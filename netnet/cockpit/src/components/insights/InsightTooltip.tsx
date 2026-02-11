"use client";

import * as React from "react";
import type { InsightSpec } from "./types";

type Props = {
  /** Short label shown as the tooltip header */
  label: string;
  /** Structured guidance */
  insight: InsightSpec;
  /** The element being wrapped */
  children: React.ReactNode;
  /** Optional: align bubble */
  align?: "left" | "right" | "center";
  /** Optional: max width */
  maxWidthClassName?: string;
};

/**
 * InsightTooltip
 * - Desktop: hover/focus bubble (CSS-only)
 * - Mobile: tap-to-open <details> bubble
 *
 * Safe default: does not intercept clicks; wrapper is inline-block.
 */
export function InsightTooltip({
  label,
  insight,
  children,
  align = "center",
  maxWidthClassName = "max-w-[22rem]",
}: Props) {
  const alignClass =
    align === "left"
      ? "left-0"
      : align === "right"
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  const Bubble = (
    <div
      className={["pointer-events-none absolute z-50 mt-2", alignClass].join(" ")}
      aria-hidden="true"
    >
      <div
        className={[
          "rounded-2xl border border-black/10 bg-white/95 shadow-lg backdrop-blur",
          "p-3 text-sm text-black",
          maxWidthClassName,
        ].join(" ")}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/70">
          {label}
        </div>

        <div className="space-y-2">
          <Section title="What" body={insight.what} />
          {insight.why ? <Section title="Why" body={insight.why} /> : null}
          {insight.requires?.length ? <List title="Requires" items={insight.requires} /> : null}
          {insight.outputs?.length ? <List title="Outputs" items={insight.outputs} /> : null}
        </div>
      </div>
    </div>
  );

  return (
    <span className="relative inline-block">
      {/* Desktop bubble */}
      <span className="group inline-block">
        <span className="inline-block">{children}</span>
        <span className="hidden group-hover:block group-focus-within:block">{Bubble}</span>
      </span>

      {/* Mobile bubble (tap) */}
      <span className="mt-2 block md:hidden">
        <details className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-xs">
          <summary className="cursor-pointer select-none font-medium text-black/70">
            {label} help
          </summary>
          <div className="mt-2 space-y-2 text-sm text-black">
            <Section title="What" body={insight.what} />
            {insight.why ? <Section title="Why" body={insight.why} /> : null}
            {insight.requires?.length ? <List title="Requires" items={insight.requires} /> : null}
            {insight.outputs?.length ? <List title="Outputs" items={insight.outputs} /> : null}
          </div>
        </details>
      </span>
    </span>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-black/60">{title}</div>
      <div className="leading-snug text-black/90">{body}</div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-black/60">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-black/90">
        {items.map((it, idx) => (
          <li key={idx} className="leading-snug">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
