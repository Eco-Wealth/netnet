"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  /** Short, scannable “what you do here” */
  purpose: string;
};

const NAV: NavItem[] = [
  {
    href: "/proof",
    label: "Proof",
    purpose: "Receipts",
    hint:
      "Build verifiable proof objects for actions (drafts and receipts). Use this when you want a machine-readable record of what happened, why, and with which references.",
  },
  {
    href: "/retire",
    label: "Retire",
    purpose: "Carbon",
    hint:
      "Plan/prepare carbon retirements and related certificates. Default behavior should stay proposal-only unless you explicitly approve execution elsewhere.",
  },
  {
    href: "/execute",
    label: "Execute",
    purpose: "Actions",
    hint:
      "Run safe operator actions (dry runs, proposal packets). This is where an agent can prepare a plan, but execution should remain gated by policy/limits.",
  },
  {
    href: "/work",
    label: "Work",
    purpose: "Queue",
    hint:
      "Ops queue for humans + agents. Create items, append events, and track status. Treat this as the canonical audit trail for tasks and decisions.",
  },
  {
    href: "/identity",
    label: "Identity",
    purpose: "Who/Why",
    hint:
      "Operator identity, intent, and attribution. Keep this accurate—proof objects and work events should reference the right actor/beneficiary.",
  },
  {
    href: "/governance",
    label: "Governance",
    purpose: "Limits",
    hint:
      "Permissions, budgets, allowlists, and kill switches. Set the caps that keep the system safe. If something is unclear, stay in propose-only.",
  },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/proof") return pathname === "/" || pathname.startsWith("/proof");
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Shell: global wrapper + top nav.
 * - Compact density (tight but readable)
 * - Hover/tap “insight” per tab (purpose + hint)
 */
export default function Shell({
  title = "netnet cockpit",
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const active = useMemo(() => NAV.find((n) => isActivePath(pathname, n.href)), [pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">{title}</div>
            <div className="truncate text-xs text-[color:var(--muted)]">
              {subtitle ?? (active ? `${active.purpose} — ${active.hint}` : "Operator-first. Safe-by-default.")}
            </div>
          </div>

          <NavBar pathname={pathname} />
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-3 py-4">{children}</main>
    </div>
  );
}

function NavBar({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        const show = open === item.href;

        return (
          <div key={item.href} className="relative flex items-center">
            <Link
              href={item.href}
              className={cn(
                "group relative inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                "border border-[color:var(--border)] bg-[color:var(--panel)]",
                "hover:bg-[color:var(--panel2)]",
                active && "bg-[color:var(--panel2)] ring-1 ring-[color:var(--ring)]"
              )}
              aria-current={active ? "page" : undefined}
              title={`${item.purpose}: ${item.hint}`} // desktop native tooltip fallback
              onClick={() => setOpen(null)}
            >
              <span className="leading-none">{item.label}</span>

              {/* Hover bubble (desktop) */}
              <span
                className={cn(
                  "pointer-events-none absolute right-0 top-full mt-2 hidden w-64",
                  "rounded-xl border border-[color:var(--border)] bg-[color:var(--panel2)] p-2 text-[11px] text-[color:var(--fg)] shadow-lg",
                  "group-hover:block"
                )}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  {item.purpose}
                </div>
                <div className="mt-1 leading-snug text-[color:var(--fg)]">{item.hint}</div>
                <div className="mt-1 text-[10px] text-[color:var(--muted)]">
                  Tip: On mobile, tap ⓘ for this help.
                </div>
              </span>
            </Link>

            {/* Mobile help toggle */}
            <button
              type="button"
              className={cn(
                "ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full",
                "border border-[color:var(--border)] bg-[color:var(--panel)] text-xs",
                "hover:bg-[color:var(--panel2)]",
                show && "ring-1 ring-[color:var(--ring)]"
              )}
              aria-label={`Help for ${item.label}`}
              onClick={() => setOpen((prev) => (prev === item.href ? null : item.href))}
            >
              ⓘ
            </button>

            {show ? (
              <div
                className={cn(
                  "absolute right-0 top-full mt-2 w-72",
                  "rounded-xl border border-[color:var(--border)] bg-[color:var(--panel2)] p-2 text-[11px] shadow-lg"
                )}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  {item.purpose}
                </div>
                <div className="mt-1 leading-snug">{item.hint}</div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
