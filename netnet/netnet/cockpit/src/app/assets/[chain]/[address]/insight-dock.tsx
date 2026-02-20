"use client";

import { Card, Muted } from "@/components/ui";

export default function InsightDock() {
  return (
    <Card title="Workspace Insights" subtitle="What this page does (and doesn't) — at a glance.">
      <div className="grid gap-2 text-sm">
        <Muted>
          This workspace is a dense operator panel for a single asset reference. It should produce proposals, proofs, and
          work items—never silent execution.
        </Muted>
        <div className="grid gap-1">
          <div className="font-medium">Primary actions</div>
          <ul className="list-disc pl-5 opacity-90">
            <li>Scan-link generation (EcoToken scan) when you have a tx hash.</li>
            <li>Create Work items for follow-up.</li>
            <li>Attach proofs/results to Work for audit trail.</li>
          </ul>
        </div>
        <div className="grid gap-1">
          <div className="font-medium">Limitations (by design)</div>
          <ul className="list-disc pl-5 opacity-90">
            <li>No broadcast trades.</li>
            <li>No automatic spending or irreversible actions.</li>
            <li>Everything returns an output packet you can review.</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
