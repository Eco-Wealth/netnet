"use client";

import React from "react";
import { Button, Card, HoverInfo, Input, Muted, Textarea } from "@/components/ui";

export default function ExecutePage() {
  const [task, setTask] = React.useState("Retire $25 of biodiversity credits via Bridge.eco and return certificate_id.");
  const [notes, setNotes] = React.useState("Constraints: conservative execution, no leverage, record tx hash, track to RETIRED.");
  const [out, setOut] = React.useState("");

  function fakeRun() {
    setOut(
      [
        "This is a placeholder execution surface.",
        "",
        "Next step:",
        "- wire to OpenClaw agent task queue",
        "- add Bankr execution skill hooks",
        "- add Moltbook post + evidence packaging",
      ].join("\n"),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Execute</div>
        <Muted>Operator panel for conservative, verifiable plans. Default mode: PROPOSE_ONLY.</Muted>
      </div>

      <Card title="Task draft">
        <div className="space-y-2">
          <div>
            <div className="mb-1 text-sm text-[color:var(--muted)]">Task</div>
            <Input value={task} onChange={(e) => setTask(e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-sm text-[color:var(--muted)]">Notes / constraints</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fakeRun}
              insight={{
                what: "Queue a proposed action package.",
                when: "After task and constraints are ready.",
                costs: "Compute only in this placeholder mode.",
                requires: "Operator approval before any spend-adjacent execution.",
                output: "Draft execution packet + next-step checklist.",
              }}
            >
              Queue (placeholder)
            </Button>
            <HoverInfo
              label={<span className="nn-chip">Insight</span>}
              what="This queue action does not sign transactions."
              impact="Keeps execution safe-by-default."
              requires="Governance policy for any later execution."
              output="Readable execution plan."
            />
          </div>
          {out ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-[color:var(--border)] bg-[hsl(var(--panel2))] p-3 text-xs">{out}</pre>
          ) : null}
        </div>
      </Card>

      <Card title="Planned modules">
        <div className="space-y-1.5 text-sm text-[color:var(--muted)]">
          <div>• Bankr execution (swap / schedule / rebalance) via skill wrapper</div>
          <div>• GitHub “dev loop” runner (issues → PRs) with strict diff/commit hygiene</div>
          <div>• BD outreach generator with deliverable escrow + proof packaging</div>
          <div>• Moltbook posting + coordination</div>
        </div>
      </Card>
    </div>
  );
}
