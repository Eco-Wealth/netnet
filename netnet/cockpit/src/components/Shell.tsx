'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type NavItem = { href: string; label: string; hint?: string };

const NAV: NavItem[] = [
  { href: "/proof", label: "Proof", hint: "Build/inspect proof objects" },
  { href: "/execute", label: "Execute", hint: "Propose actions and review outputs" },
  { href: "/retire", label: "Retire", hint: "Carbon retirement planning + handoff" },
  { href: "/work", label: "Work", hint: "Queue + audit trail for ops" },
  { href: "/governance", label: "Governance", hint: "Caps, allowlists, kill switches" },
  { href: "/wallet", label: "Wallet", hint: "Read-only wallet state surfaces" },
];

export type ShellProps = {
  /** Optional page title. If omitted, a safe default is used. */
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Shell({
  title = "netnet cockpit",
  subtitle,
  children,
}: ShellProps) {
  const pathname = usePathname() || "/";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold leading-tight">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 truncate text-xs text-neutral-400">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <nav className="flex flex-wrap justify-end gap-1">
              {NAV.map((n) => {
                const active =
                  pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    title={n.hint || n.label}
                    className={cx(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium",
                      "border border-white/10 bg-white/5 hover:bg-white/10",
                      active && "border-white/25 bg-white/10"
                    )}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
    </div>
  );
}
