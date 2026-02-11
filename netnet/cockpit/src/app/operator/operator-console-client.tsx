"use client";

import { useState, useTransition } from "react";
import type { MessageEnvelope } from "@/lib/operator/model";
import { Button, Card, Input, Muted, Pill } from "@/components/ui";
import type { OperatorThreadSnapshot } from "./actions";
import { postOperatorMessage } from "./actions";

type OperatorConsoleClientProps = {
  initial: OperatorThreadSnapshot;
};

function roleTone(role: MessageEnvelope["role"]) {
  if (role === "system") return "border-[color:var(--border)] bg-[color:var(--surface-2)]";
  if (role === "operator") return "border-[color:var(--accent)]/40 bg-[color:var(--surface)]";
  if (role === "assistant") return "border-[color:var(--primary)]/40 bg-[color:var(--surface)]";
  return "border-[color:var(--success)]/35 bg-[color:var(--surface)]";
}

export default function OperatorConsoleClient({ initial }: OperatorConsoleClientProps) {
  const [snapshot, setSnapshot] = useState<OperatorThreadSnapshot>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function onSend() {
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      const next = await postOperatorMessage({ content });
      setSnapshot(next);
      setDraft("");
    });
  }

  return (
    <div className="grid gap-3">
      <Card
        title="Operator Thread"
        subtitle="In-memory message log (scaffold). No external model or execution integrations."
      >
        <div className="max-h-[420px] space-y-2 overflow-auto rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          {snapshot.messages.map((m) => (
            <div key={m.id} className={`rounded-[var(--r-sm)] border p-2 ${roleTone(m.role)}`}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <Pill>{m.role}</Pill>
                <span className="text-[color:var(--muted)]">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{m.content}</div>
              {m.metadata?.action ? (
                <div className="mt-1 text-xs text-[color:var(--muted)]">action: {m.metadata.action}</div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Compose"
        subtitle="Operator notes only. Assistant response is local deterministic scaffold."
      >
        <div className="grid gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type an operator instruction or note…"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <Muted>Mode is fixed to READ_ONLY in Unit 016.</Muted>
            <Button
              onClick={onSend}
              disabled={pending || !draft.trim()}
              insight={{
                what: "Append operator message to in-memory thread.",
                when: "Use for planning and coordination drafts.",
                requires: "READ_ONLY mode; no external API or execution path.",
                output: "Stored operator message plus local assistant acknowledgment.",
              }}
            >
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
