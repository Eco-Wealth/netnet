"use client";

import { useState, useTransition } from "react";
import type { MessageEnvelope } from "@/lib/operator/model";
import { Button, Card, Input, Muted, Pill } from "@/components/ui";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import type { OperatorThreadSnapshot } from "./actions";
import {
  approveOperatorProposal,
  executeProposalAction,
  generateExecutionPlanAction,
  lockExecutionIntentAction,
  postOperatorMessage,
  requestExecutionIntentAction,
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

  function onRequestExecutionIntent(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await requestExecutionIntentAction(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function onLockExecutionIntent(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await lockExecutionIntentAction(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function onGenerateExecutionPlan(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await generateExecutionPlanAction(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function onExecuteNow(id: string) {
    setActiveProposalId(id);
    startTransition(async () => {
      const next = await executeProposalAction(id);
      setSnapshot(next);
      setActiveProposalId(null);
    });
  }

  function renderProposalCard(messageId: string, proposal: SkillProposalEnvelope) {
    const isDraft = proposal.status === "draft";
    const isApproved = proposal.status === "approved";
    const executionIntent = proposal.executionIntent ?? "none";
    const executionStatus = proposal.executionStatus ?? "idle";
    const canRequestIntent = isApproved && executionIntent === "none";
    const canLockIntent = isApproved && executionIntent === "requested";
    const canGeneratePlan = isApproved && executionIntent === "locked";
    const canExecuteNow =
      isApproved && executionIntent === "locked" && executionStatus === "idle";
    const busy = pending && activeProposalId === messageId;

    return (
      <div className="mt-2 rounded-[var(--r-sm)] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill>{proposal.skillId}</Pill>
          <Pill>risk: {proposal.riskLevel}</Pill>
          <Pill>status: {proposal.status}</Pill>
          <Pill>execution intent: {executionIntent}</Pill>
          <Pill>execution: {executionStatus}</Pill>
        </div>
        <div className="mt-2 text-xs text-[color:var(--muted)]">route: {proposal.route}</div>
        <div className="mt-1 whitespace-pre-wrap text-sm">{proposal.reasoning}</div>
        <div className="mt-2 flex items-center gap-2">
          {isDraft ? (
            <>
              <Button
                size="sm"
                onClick={() => onApproveProposal(messageId)}
                disabled={busy}
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
                disabled={busy}
                insight={{
                  what: "Reject this proposal and prevent future execution eligibility.",
                  when: "When proposal quality, scope, or risk is unacceptable.",
                  requires: "Human rejection only; no route execution.",
                  output: "Proposal status updated to rejected and audit note message.",
                }}
              >
                {busy ? "Working…" : "Reject"}
              </Button>
            </>
          ) : null}

          {isApproved ? (
            <Button
              size="sm"
              onClick={() => onRequestExecutionIntent(messageId)}
              disabled={!canRequestIntent || busy}
              insight={{
                what: "Request execution intent for this approved proposal.",
                when: "After approval and readiness review.",
                requires: "Proposal must be approved; no execution route calls.",
                output: "Proposal execution intent set to requested.",
              }}
            >
              {busy ? "Working…" : "Request Execution Intent"}
            </Button>
          ) : null}

          {canLockIntent ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onLockExecutionIntent(messageId)}
              disabled={busy}
              insight={{
                what: "Lock execution intent state without executing.",
                when: "After intent is requested and operator wants a hard checkpoint.",
                requires: "Execution intent must already be requested.",
                output: "Proposal execution intent set to locked.",
              }}
            >
              {busy ? "Working…" : "Lock Execution Intent"}
            </Button>
          ) : null}

          {canGeneratePlan ? (
            <Button
              size="sm"
              onClick={() => onGenerateExecutionPlan(messageId)}
              disabled={busy}
              insight={{
                what: "Generate a deterministic dry-run execution plan for this proposal.",
                when: "After execution intent is locked and operator wants a final preview.",
                requires: "Locked execution intent; no route invocation.",
                output: "ExecutionPlan summary and route/payload preview in thread.",
              }}
            >
              {busy ? "Working…" : "Generate Execution Plan"}
            </Button>
          ) : null}

          {canExecuteNow ? (
            <Button
              size="sm"
              onClick={() => onExecuteNow(messageId)}
              disabled={busy}
              insight={{
                what: "Execute this locked proposal through the orchestrator.",
                when: "After approval and final plan review are complete.",
                requires: "Approved proposal, locked execution intent, and passing policy gate.",
                output: "Execution status/result recorded in proposal metadata and audit message.",
              }}
            >
              {busy ? "Working…" : "Execute Now"}
            </Button>
          ) : null}
        </div>

        {proposal.executionResult ? (
          <div className="mt-2 rounded-[var(--r-sm)] border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
            <div className="text-xs text-[color:var(--muted)]">execution result</div>
            <div className="mt-1 text-xs text-[color:var(--muted)]">
              status: {proposal.executionStatus}
              {proposal.executionCompletedAt
                ? ` at ${new Date(proposal.executionCompletedAt).toLocaleString()}`
                : ""}
            </div>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(proposal.executionResult, null, 2)}
            </pre>
          </div>
        ) : null}

        {proposal.executionError ? (
          <div className="mt-2 text-xs text-[color:var(--warn)]">
            execution error: {proposal.executionError}
          </div>
        ) : null}
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
              {m.metadata?.plan ? (
                <div className="mt-2 rounded-[var(--r-sm)] border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                  <div className="text-xs text-[color:var(--muted)]">dry-run plan</div>
                  <div className="mt-1 text-sm">{m.metadata.plan.summary}</div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    route preview: {m.metadata.plan.steps[0]?.route ?? "n/a"}
                  </div>
                </div>
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
