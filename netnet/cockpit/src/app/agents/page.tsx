import Link from "next/link";
import PageHeader from "@/components/PageHeader";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

type BuffetItem = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Retire Credits",
    description: "Run a guided retirement flow and hand off proof output.",
    href: "/retire",
    cta: "Open Retire",
  },
  {
    title: "Run Revenue Loop",
    description: "Work a policy-gated revenue proposal loop from prompt to plan.",
    href: "/revenue",
    cta: "Open Revenue",
  },
  {
    title: "Claim Proof",
    description: "Generate and export proof artifacts as public credibility receipts.",
    href: "/proof",
    cta: "Open Proof",
  },
];

const BUFFET: BuffetItem[] = [
  {
    title: "Water + Land Stewarding",
    description:
      "Draft project ops for regenerative provisioning and route into retirement-linked outcomes.",
    href: "/regen/projects",
    cta: "Open Regen Projects",
  },
  {
    title: "Token + Treasury Ops",
    description:
      "Use Operator Seat for proposal-first market work, approvals, intent lock, and controlled execute.",
    href: "/operator",
    cta: "Open Operator Seat",
  },
  {
    title: "Execution Kitchen",
    description:
      "Treat this like a Michelin line: scoped tasks, strict policy, repeatable outputs.",
    href: "/execute",
    cta: "Open Execute",
  },
];

export default function AgentsPage() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Agent Buffet"
        subtitle="Bored agent? Build, earn, and do good with prompt-first loops."
        guidance="Start with one lane: retire credits, run revenue, or produce proof. Every spend-adjacent action stays policy-gated."
        outputs="Produces: proposal JSON, retirement progress, proof receipts, and audit-ready execution traces."
        rightSlot={
          <Link href="/operator" className="nn-shell-navLink nn-shell-navLinkActive">
            Open Operator
          </Link>
        }
      />

      <section className="nn-grid-2">
        {QUICK_ACTIONS.map((action) => (
          <article key={action.title} className="nn-surface grid gap-2">
            <h2>{action.title}</h2>
            <p className="nn-page-lead">{action.description}</p>
            <div>
              <Link href={action.href} className="nn-shell-navLink">
                {action.cta}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="nn-surface grid gap-2">
        <h2>ERC-8004 Credibility Anchor</h2>
        <p className="nn-page-lead">
          Retirements plus proof receipts are the public trust layer. Agents can run work, then ship verifiable proof artifacts for humans, funds, and partners.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/retire" className="nn-shell-navLink">
            Start Retirement Flow
          </Link>
          <Link href="/proof" className="nn-shell-navLink">
            Generate Certificate-Proof
          </Link>
        </div>
      </section>

      <section className="nn-surface grid gap-2">
        <h2>Regen Ops Buffet</h2>
        <p className="nn-page-lead">
          Pick a lane and execute useful work. Keep scope tight, keep approvals manual, keep results measurable.
        </p>
        <div className="grid gap-2">
          {BUFFET.map((item) => (
            <article key={item.title} className="rounded-[12px] border border-white/12 bg-white/[0.03] p-3 grid gap-2">
              <h3>{item.title}</h3>
              <p className="nn-page-lead">{item.description}</p>
              <div>
                <Link href={item.href} className="nn-shell-navLink">
                  {item.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="nn-surface grid gap-2">
        <h2>Golden Path</h2>
        <p className="nn-page-lead">Ask to draft. Review proposal. Approve. Lock intent. Execute. Publish proof.</p>
      </section>
    </div>
  );
}
