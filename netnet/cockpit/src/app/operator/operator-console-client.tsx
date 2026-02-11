"use client";

import { useState, useTransition } from "react";
import type { MessageEnvelope } from "@/lib/operator/model";
import { Button, Card, Input, Muted, Pill } from "@/components/ui";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import type { OperatorThreadSnapshot } from "./actions";
import {
  approveOperatorProposal,
  postOperatorMessage,
  rejectOperatorProposal,
} from "./actions";

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
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
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

  function onApproveProposal(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await approveOperatorProposal(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function onRejectProposal(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await rejectOperatorProposal(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function renderProposalCard(messageId: string, proposal: SkillProposalEnvelope) {
    const isDraft = proposal.status === "draft";
    const busy = pending && activeProposalId === messageId;

    return (
      <div className="mt-2 rounded-[var(--r-sm)] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill>{proposal.skillId}</Pill>
          <Pill>risk: {proposal.riskLevel}</Pill>
          <Pill>status: {proposal.status}</Pill>
        </div>
        <div className="mt-2 text-xs text-[color:var(--muted)]">route: {proposal.route}</div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{proposal.reasoning}</div>
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApproveProposal(messageId)}
            disabled={!isDraft || busy}
            insight={{
              what: "Mark this proposal as approved for future execution layer eligibility.",
              when: "After operator review of risk and reasoning.",
              requires: "Human approval only; no route execution.",
              output: "Proposal status updated to approved and audit note message.",
            }}
          >
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRejectProposal(messageId)}
            disabled={!isDraft || busy}
            insight={{
              what: "Reject this proposal and prevent future execution eligibility.",
              when: "When proposal quality, scope, or risk is unacceptable.",
              requires: "Human rejection only; no route execution.",
              output: "Proposal status updated to rejected and audit note message.",
            }}
          >
            {busy ? "Working…" : "Reject"}
          </Button>
        </div>
      </div>
    );
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
              {m.metadata?.proposal ? renderProposalCard(m.id, m.metadata.proposal) : null}
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
