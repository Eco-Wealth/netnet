"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  what: string;
  when: string;
  costs: string;
  requires: string;
  output: string;
};

const NAV: NavItem[] = [
  {
    href: "/proof",
    label: "Proof",
    what: "Build verifiable proof objects for actions.",
    when: "After planning or execution when you need machine-readable receipts.",
    costs: "Low compute only.",
    requires: "No fund movement. Operator attribution recommended.",
    output: "proof object + shareable references.",
  },
  {
    href: "/retire",
    label: "Retire",
    what: "Prepare carbon retirement intents and tracking details.",
    when: "When offset plans are needed for actions or portfolios.",
    costs: "Potential token spend if executed externally.",
    requires: "Operator approval + policy caps.",
    output: "retirement proposal + proof links.",
  },
  {
    href: "/execute",
    label: "Execute",
    what: "Draft and queue operator/agent actions.",
    when: "When translating policy-approved intent into stepwise plans.",
    costs: "Compute and possible downstream gas if approved.",
    requires: "Autonomy level and policy gates.",
    output: "proposal packet, work item, and status events.",
  },
  {
    href: "/work",
    label: "Work",
    what: "Track tasks, ownership, and event trails.",
    when: "Any time work crosses human/agent boundaries.",
    costs: "No spend by default.",
    requires: "Named owner and acceptance criteria preferred.",
    output: "auditable work timeline.",
  },
  {
    href: "/identity",
    label: "Identity",
    what: "Define actor identity and operator intent.",
    when: "Before issuing actions and proofs.",
    costs: "None.",
    requires: "Accurate beneficiary/operator metadata.",
    output: "attribution context for proofs and work.",
  },
  {
    href: "/governance",
    label: "Governance",
    what: "Set autonomy levels, limits, and kill switches.",
    when: "Before enabling any spend-adjacent behavior.",
    costs: "No spend by default.",
    requires: "Operator decision + review.",
    output: "enforced policy envelope.",
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
              {subtitle ?? (active ? `${active.what} Output: ${active.output}` : "Operator-first. Safe-by-default.")}
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
                "border border-[color:var(--border)] bg-[hsl(var(--panel))]",
                "hover:bg-[hsl(var(--panel2))]",
                active && "bg-[hsl(var(--panel2))] ring-1 ring-[color:var(--ring)]"
              )}
              aria-current={active ? "page" : undefined}
              title={`What: ${item.what} | When: ${item.when} | Costs: ${item.costs} | Requires: ${item.requires} | Output: ${item.output}`}
              onClick={() => setOpen(null)}
            >
              <span className="leading-none">{item.label}</span>

              {/* Hover bubble (desktop) */}
              <span
                className={cn(
                  "pointer-events-none absolute right-0 top-full mt-2 hidden w-64",
                  "rounded-xl border border-[color:var(--border)] bg-[hsl(var(--panel2))] p-2 text-[11px] text-[color:var(--fg)] shadow-lg",
                  "group-hover:block"
                )}
              >
                <InsightBody item={item} />
              </span>
            </Link>

            {/* Mobile help toggle */}
            <button
              type="button"
              className={cn(
                "ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full",
                "border border-[color:var(--border)] bg-[hsl(var(--panel))] text-xs",
                "hover:bg-[hsl(var(--panel2))]",
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
                  "rounded-xl border border-[color:var(--border)] bg-[hsl(var(--panel2))] p-2 text-[11px] shadow-lg"
                )}
              >
                <InsightBody item={item} />
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function InsightBody({ item }: { item: NavItem }) {
  return (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">What</div>
      <div className="mt-0.5 leading-snug text-[color:var(--fg)]">{item.what}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">When</div>
      <div className="mt-0.5 leading-snug">{item.when}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">Costs</div>
      <div className="mt-0.5 leading-snug">{item.costs}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">Requires</div>
      <div className="mt-0.5 leading-snug">{item.requires}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">Output</div>
      <div className="mt-0.5 leading-snug">{item.output}</div>
    </>
  );
}
