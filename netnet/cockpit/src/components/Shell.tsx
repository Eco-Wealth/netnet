"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui";
import Insight from "@/components/Insight";
import type { InsightSpec } from "@/lib/insight";

type ShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

const NAV = [
  {
    href: "/proof",
    label: "Proof",
    insight: {
      what: "Build and inspect proof objects for operator and agent actions.",
      when: "After scans, proposals, or execution outputs need a verifiable receipt.",
      requires: "No funds movement; read/propose mode is sufficient.",
      output: "Exportable proof JSON and share-ready proof text.",
    } satisfies InsightSpec,
  },
  {
    href: "/retire",
    label: "Retire",
    insight: {
      what: "Step through credit retirement flow in a safe operator-guided path.",
      when: "When you need a retirement quote, tracking, and downstream proof.",
      requires: "Policy approval for spend-adjacent execution paths.",
      output: "Retirement intent, transaction tracking state, and proof handoff.",
    } satisfies InsightSpec,
  },
  {
    href: "/execute",
    label: "Execute",
    insight: {
      what: "Draft constrained operator tasks for agents and workflows.",
      when: "When moving from idea to reviewed, policy-aware action plans.",
      requires: "Explicit caps and approvals for any spend-adjacent action.",
      output: "Queued or proposed execution payloads and audit context.",
    } satisfies InsightSpec,
  },
  {
    href: "/identity",
    label: "Identity",
    insight: {
      what: "Manage agent/operator identity metadata used in proofs.",
      when: "Before creating proofs or coordinating actions across systems.",
      requires: "Local browser state only; no external execution permissions.",
      output: "Stable identity fields included in generated proof objects.",
    } satisfies InsightSpec,
  },
  {
    href: "/governance",
    label: "Governance",
    insight: {
      what: "Set autonomy level, caps, allowlists, and kill switches.",
      when: "Before enabling proposals or any execution behavior.",
      requires: "Operator authority to change global policy.",
      output: "Persisted policy envelope used by spend-adjacent routes.",
    } satisfies InsightSpec,
  },
  {
    href: "/operator",
    label: "Operator",
    insight: {
      what: "Chat-first operator seat for proposals, approvals, planning, and controlled execution.",
      when: "Use as the main command center for coordinating skills and strategy templates.",
      requires: "Policy gates and explicit operator approvals for spend-adjacent actions.",
      output: "Auditable message envelopes, proposal state, plan previews, and execution results.",
    } satisfies InsightSpec,
  },
];

export default function Shell({ title, subtitle, children }: ShellProps) {
  const pathname = usePathname();
  const isOperatorRoute = pathname?.startsWith("/operator");
  const inferredTitle =
    title ||
    NAV.find((n) => pathname?.startsWith(n.href))?.label ||
    "Cockpit";

  if (isOperatorRoute) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white">
        <main className="h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold">{inferredTitle}</div>
            {subtitle ? <div className="mt-1 text-sm opacity-75">{subtitle}</div> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Insight key={item.href} insight={item.insight}>
                  <Link
                    href={item.href}
                    className={[
                      "rounded-full border px-3 py-1 text-sm transition",
                      active ? "border-black" : "opacity-75 hover:opacity-100",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </Insight>
              );
            })}
          </nav>
        </header>

        <main className="mt-6">
          <Card>{children}</Card>
        </main>
      </div>
    </div>
  );
}
