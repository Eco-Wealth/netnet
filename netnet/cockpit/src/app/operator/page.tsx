import OperatorConsoleClient from "./operator-console-client";
import { readOperatorThread } from "./actions";
import { Card, Muted, Pill } from "@/components/ui";

export default async function OperatorPage() {
  const snapshot = await readOperatorThread();

  return (
    <div className="grid gap-4">
      <Card title="Operator Layer" subtitle="Stable AI console foundation (scaffold)">
        <div className="grid gap-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>mode: {snapshot.status.mode}</Pill>
            <Pill>policy autonomy: {snapshot.status.policyAutonomy}</Pill>
          </div>
          <Muted>
            Policy snapshot: updated by {snapshot.status.policyUpdatedBy} at{" "}
            {new Date(snapshot.status.policyUpdatedAt).toLocaleString()}
          </Muted>
          <Muted>
            Unit 016 behavior is intentionally read-only. No OpenRouter wiring, no external API calls, no execution.
          </Muted>
        </div>
      </Card>

      <OperatorConsoleClient initial={snapshot} />
    </div>
  );
}

