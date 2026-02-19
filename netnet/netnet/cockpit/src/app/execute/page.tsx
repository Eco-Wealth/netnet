"use client";

import React from "react";
import PageHeader from "@/components/PageHeader";
import { Button, Card, Input, Textarea } from "@/components/ui";

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
    <div className="nn-page-stack">
      <PageHeader
        title="Execute"
        subtitle="Draft constrained tasks before any real execution path."
        guidance="Write the task, add constraints, then queue the draft for policy-aware review."
        outputs="Produces: execution draft text and placeholder queue output."
      />

      <Card title="Task draft">
        <div className="space-y-3">
          <div>
            <div className="text-sm mb-1 text-neutral-300">Task</div>
            <Input value={task} onChange={(e) => setTask(e.target.value)} />
          </div>
          <div>
            <div className="text-sm mb-1 text-neutral-300">Notes / constraints</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <Button onClick={fakeRun}>Queue Draft</Button>
          {out ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-neutral-900 bg-black/40 p-3 text-xs">{out}</pre>
          ) : null}
        </div>
      </Card>

      <Card title="Planned modules">
        <div className="space-y-2 text-sm text-neutral-300">
          <div>• Bankr execution (swap / schedule / rebalance) via skill wrapper</div>
          <div>• GitHub “dev loop” runner (issues → PRs) with strict diff/commit hygiene</div>
          <div>• BD outreach generator with deliverable escrow + proof packaging</div>
          <div>• Moltbook posting + coordination</div>
        </div>
      </Card>
    </div>
  );
}
