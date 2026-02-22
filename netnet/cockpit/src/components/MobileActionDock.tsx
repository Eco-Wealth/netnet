"use client";

import * as React from "react";

/**
 * MobileActionDock
 * A compact, thumb-zone action bar. Safe to drop into any page.
 */
export function MobileActionDock({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "fixed inset-x-0 bottom-0 z-40",
        "pointer-events-none",
        "pb-[calc(env(safe-area-inset-bottom,0px)+12px)]",
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-5xl px-3">
        <div
          className={[
            "pointer-events-auto",
            "rounded-2xl border border-white/10 bg-black/70 backdrop-blur",
            "shadow-[0_10px_30px_rgba(0,0,0,0.45)]",
            "px-2 py-2",
            className,
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
