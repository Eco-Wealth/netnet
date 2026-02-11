"use client";

import * as React from "react";

/**
 * Insight
 * Lightweight hover/focus helper. Uses native title as fallback on mobile.
 */
export function Insight({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={["relative inline-flex items-center", className].join(" ")}>
      <span className="inline-flex items-center gap-1" title={`${label}: ${hint}`}>
        {children}
      </span>
      <span className="sr-only">{hint}</span>
    </span>
  );
}
