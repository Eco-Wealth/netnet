"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";
import { toInsightTitle } from "@/lib/insight";
import { Insight } from "@/components/Insight";

type NavItem = {
  href: string;
  label: string;
  what: string;
  when: string;
  requires: string;
  output: string;
};

const NAV: NavItem[] = [
  {
    href: "/proof",
    label: "Proof",
    what: "Build verifiable proof objects for actions.",
    when: "After planning or execution when you need machine-readable receipts.",
    requires: "No fund movement. Operator attribution recommended. Low compute usage only.",
    output: "proof object + shareable references.",
  },
  {
    href: "/retire",
    label: "Retire",
    what: "Prepare carbon retirement intents and tracking details.",
    when: "When offset plans are needed for actions or portfolios.",
    requires: "Operator approval + policy caps. Potential spend only in external execution.",
    output: "retirement proposal + proof links.",
  },
  {
    href: "/execute",
    label: "Execute",
    what: "Draft and queue operator/agent actions.",
    when: "When translating policy-approved intent into stepwise plans.",
    requires: "Autonomy level and policy gates. Compute and possible downstream gas if approved.",
    output: "proposal packet, work item, and status events.",
  },
  {
    href: "/work",
    label: "Work",
    what: "Track tasks, ownership, and event trails.",
    when: "Any time work crosses human/agent boundaries.",
    requires: "Named owner and acceptance criteria preferred. No spend by default.",
    output: "auditable work timeline.",
  },
  {
    href: "/identity",
    label: "Identity",
    what: "Define actor identity and operator intent.",
    when: "Before issuing actions and proofs.",
    requires: "Accurate beneficiary/operator metadata.",
    output: "attribution context for proofs and work.",
  },
  {
    href: "/governance",
    label: "Governance",
    what: "Set autonomy levels, limits, and kill switches.",
    when: "Before enabling any spend-adjacent behavior.",
    requires: "Operator decision + review. No spend by default.",
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
        <div className="mx-auto w-full max-w-5xl px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">{title}</div>
              <div className="truncate text-xs text-[color:var(--muted)]">
                {subtitle ?? (active ? `${active.what} Output: ${active.output}` : "Operator-first. Safe-by-default.")}
              </div>
            </div>
            {active ? (
              <span className="nn-chip hidden sm:inline-flex">
                {active.label}
              </span>
            ) : null}
          </div>
          <div className="mt-2">
            <NavBar pathname={pathname} />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-3 py-4">{children}</main>
    </div>
  );
}

function NavBar({ pathname }: { pathname: string }) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      {NAV.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Insight
            key={item.href}
            insight={{
              what: item.what,
              when: item.when,
              requires: item.requires,
              output: item.output,
            }}
          >
            <div className="relative flex items-center">
              <Link
                href={item.href}
                className={cn(
                  "group relative inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                  "border border-[color:var(--border)] bg-[hsl(var(--panel))]",
                  "hover:bg-[hsl(var(--panel2))]",
                  active && "bg-[hsl(var(--panel2))] ring-1 ring-[color:var(--ring)]"
                )}
                aria-current={active ? "page" : undefined}
                title={toInsightTitle(item)}
              >
                <span className="leading-none">{item.label}</span>
              </Link>
            </div>
          </Insight>
        );
      })}
    </nav>
  );
}
