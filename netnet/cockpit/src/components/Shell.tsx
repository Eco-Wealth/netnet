"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const current = NAV.find((n) => pathname?.startsWith(n.href));
  const inferredTitle =
    title ||
    current?.label ||
    "Cockpit";
  const inferredSubtitle =
    subtitle || "Policy-gated, proposal-first operator workspace.";

  if (isOperatorRoute) {
    return (
      <div className="nn-shell">
        <main className="h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div className="nn-shell">
      <div className="nn-shell-inner">
        <header className="nn-shell-header">
          <div className="nn-shell-titleWrap">
            <div className="nn-shell-eyebrow">Netnet Cockpit</div>
            <div className="nn-shell-title">{inferredTitle}</div>
            <div className="nn-shell-subtitle">{inferredSubtitle}</div>
          </div>
          <nav className="nn-shell-nav">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Insight key={item.href} insight={item.insight}>
                  <Link
                    href={item.href}
                    className={[
                      "nn-shell-navLink",
                      active ? "nn-shell-navLinkActive" : "",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </Insight>
              );
            })}
          </nav>
        </header>

        <main className="nn-shell-main">{children}</main>
      </div>
    </div>
  );
}
