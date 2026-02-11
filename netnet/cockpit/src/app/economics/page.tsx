import Link from "next/link";
import { Card, Code, Page, PageHeader } from "@/components/ui";

export default function EconomicsPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="Economics"
        subtitle="Read-only surfaces for routing and planning. Generate operator-approval packets before execution."
      />

      <Card title="Allocation planner" subtitle="Proposal-first planning with policy gates.">
        <div className="text-sm text-[color:var(--muted)]">
          Endpoint: <Code>/api/agent/allocate</Code>
        </div>
        <div className="nn-action-row text-sm">
          <Link className="underline hover:opacity-90" href="/proof">Proof</Link>
          <Link className="underline hover:opacity-90" href="/execute">Execute</Link>
          <Link className="underline hover:opacity-90" href="/retire">Retire</Link>
        </div>
        <div className="text-xs text-[color:var(--muted)]">
          Example (curl): POST JSON {"{ action: 'plan', realizedFeesUsd: 25 }"} to receive allocations + nextAction.
        </div>
      </Card>
    </Page>
  );
}
