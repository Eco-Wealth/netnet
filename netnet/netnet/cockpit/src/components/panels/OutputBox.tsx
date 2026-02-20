"use client";

import React from "react";

export function OutputBox({
  title = "Output",
  children,
  right,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="text-xs font-medium text-white/80">{title}</div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
