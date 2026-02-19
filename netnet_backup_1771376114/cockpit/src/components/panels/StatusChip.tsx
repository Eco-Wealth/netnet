"use client";

import React from "react";

type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/5 text-white/80",
  info: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  good: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  warn: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  bad: "border-rose-400/20 bg-rose-400/10 text-rose-100",
};

export function StatusChip({
  label,
  tone = "neutral",
  title,
}: {
  label: string;
  tone?: Tone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] leading-none",
        toneClass[tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
