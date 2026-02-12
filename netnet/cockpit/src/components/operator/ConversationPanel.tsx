"use client";

import { useMemo } from "react";
import FirstRunTour from "@/components/operator/FirstRunTour";
import Tooltip from "@/components/operator/Tooltip";
import { Button, Textarea } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type ConversationPanelProps = {
  messages: MessageEnvelope[];
  proposals: SkillProposalEnvelope[];
  draft: string;
  setDraft: (next: string) => void;
  onSend: () => void;
  loading: boolean;
  policyMode: string;
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
  loadingAction: string | null;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(content: string): JSX.Element {
  const blocks: JSX.Element[] = [];
  const parts = content.split(/```([\s\S]*?)```/g);

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      blocks.push(
        <pre key={`code-${i}`}>
          <code>{part.trim()}</code>
        </pre>
      );
      continue;
    }

    const lines = part.split("\n");
    const buffer: string[] = [];

    const flushParagraph = (key: string) => {
      if (!buffer.length) return;
      const text = buffer.join(" ").trim();
      buffer.length = 0;
      if (!text) return;
      blocks.push(<p key={key} dangerouslySetInnerHTML={{ __html: renderInline(text) }} />);
    };

    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx].trim();
      if (!line) {
        flushParagraph(`p-${i}-${idx}`);
        continue;
      }

      if (line.startsWith("- ")) {
        flushParagraph(`p-${i}-${idx}-before-ul`);
        const items: string[] = [line.slice(2)];
        let cursor = idx + 1;
        while (cursor < lines.length && lines[cursor].trim().startsWith("- ")) {
          items.push(lines[cursor].trim().slice(2));
          cursor += 1;
        }
        blocks.push(
          <ul key={`ul-${i}-${idx}`}>
            {items.map((item, itemIndex) => (
              <li
                key={`uli-${i}-${idx}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: renderInline(item) }}
              />
            ))}
          </ul>
        );
        idx = cursor - 1;
        continue;
      }

      if (/^\d+\.\s/.test(line)) {
        flushParagraph(`p-${i}-${idx}-before-ol`);
        const items: string[] = [line.replace(/^\d+\.\s/, "")];
        let cursor = idx + 1;
        while (cursor < lines.length && /^\d+\.\s/.test(lines[cursor].trim())) {
          items.push(lines[cursor].trim().replace(/^\d+\.\s/, ""));
          cursor += 1;
        }
        blocks.push(
          <ol key={`ol-${i}-${idx}`}>
            {items.map((item, itemIndex) => (
              <li
                key={`oli-${i}-${idx}-${itemIndex}`}
                dangerouslySetInnerHTML={{ __html: renderInline(item) }}
              />
            ))}
          </ol>
        );
        idx = cursor - 1;
        continue;
      }

      buffer.push(line);
    }

    flushParagraph(`p-${i}-tail`);
  }

  return <div className={styles["nn-markdown"]}>{blocks}</div>;
}

function modeForPolicy(policyMode: string): "READ" | "PROPOSE" | "EXECUTE" {
  if (policyMode === "READ_ONLY") return "READ";
  if (policyMode === "EXECUTE_WITH_LIMITS") return "EXECUTE";
  return "PROPOSE";
}

function roleClassName(role: MessageEnvelope["role"]): string {
  if (role === "operator") return styles["nn-messageOperator"];
  if (role === "assistant") return styles["nn-messageAssistant"];
  if (role === "skill") return styles["nn-messageSkill"];
  return styles["nn-messageSystem"];
}

function ProposalInlineCard({
  proposal,
  loadingAction,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
}: {
  proposal: SkillProposalEnvelope;
  loadingAction: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onExecute: (id: string) => void;
  onDraftStrategy: (id: string) => void;
}) {
  const canExecute =
    proposal.status === "approved" &&
    proposal.executionIntent === "locked" &&
    proposal.executionStatus === "idle" &&
    Boolean(proposal.executionPlan);

  return (
    <div
      id={`operator-proposal-${proposal.id}`}
      data-proposal-id={proposal.id}
      className={styles["nn-proposalCard"]}
    >
      <div className={styles["nn-proposalHead"]}>
        <div>
          <div className={styles["nn-proposalTitle"]}>{proposal.skillId}</div>
          <div className={styles["nn-proposalRoute"]}>{proposal.route}</div>
        </div>
        <div className={styles["nn-chipRow"]}>
          <span className={styles["nn-chip"]}>risk: {proposal.riskLevel}</span>
          <span className={styles["nn-chip"]}>status: {proposal.status}</span>
        </div>
      </div>

      <div className={styles["nn-inlineHint"]}>{proposal.reasoning}</div>
      <div className={styles["nn-proposalMeta"]}>
        <span>intent: {proposal.executionIntent}</span>
        <span>plan: {proposal.executionPlan ? proposal.executionPlan.summary : "none"}</span>
        <span>
          result:{" "}
          {proposal.executionResult
            ? proposal.executionResult.ok
              ? "success"
              : "failed"
            : "none"}
        </span>
      </div>

      <div className={styles["nn-actions"]}>
        {proposal.status === "draft" ? (
          <>
            <Tooltip text="Approve this draft proposal.">
              <span data-tour-target="approve-button">
                <Button
                  size="sm"
                  onClick={() => onApprove(proposal.id)}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === `approve:${proposal.id}` ? "Approving..." : "Approve"}
                </Button>
              </span>
            </Tooltip>
            <Tooltip text="Reject this proposal and stop its flow.">
              <span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(proposal.id)}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === `reject:${proposal.id}` ? "Rejecting..." : "Reject"}
                </Button>
              </span>
            </Tooltip>
          </>
        ) : null}

        {proposal.status === "approved" && proposal.executionIntent === "none" ? (
          <Tooltip text="Request intent before lock.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onRequestIntent(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `request:${proposal.id}` ? "Requesting..." : "Request Intent"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.executionIntent === "requested" ? (
          <Tooltip text="Lock intent for execution path.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onLockIntent(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `lock:${proposal.id}` ? "Locking..." : "Lock Intent"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.executionIntent === "locked" && proposal.executionStatus === "idle" ? (
          <Tooltip text="Generate dry-run execution plan.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onGeneratePlan(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `plan:${proposal.id}` ? "Planning..." : "Generate Plan"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {canExecute ? (
          <Tooltip text="Execute approved, locked, planned proposal.">
            <span data-tour-target="execute-button">
              <Button
                size="sm"
                onClick={() => onExecute(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `execute:${proposal.id}` ? "Executing..." : "Execute"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.status === "approved" ? (
          <Tooltip text="Create a strategy draft from this proposal.">
            <span>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => onDraftStrategy(proposal.id)}
                disabled={loadingAction !== null}
              >
                {loadingAction === `strategy:${proposal.id}` ? "Drafting..." : "Draft Strategy"}
              </Button>
            </span>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

export default function ConversationPanel({
  messages,
  proposals,
  draft,
  setDraft,
  onSend,
  loading,
  policyMode,
  skills,
  strategies,
  onApprove,
  onReject,
  onRequestIntent,
  onLockIntent,
  onGeneratePlan,
  onExecute,
  onDraftStrategy,
  loadingAction,
}: ConversationPanelProps) {
  const ordered = useMemo(() => [...messages].sort((a, b) => a.createdAt - b.createdAt), [messages]);
  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals]
  );
  const activeMode = modeForPolicy(policyMode);

  return (
    <div id="operator-conversation-root" className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <FirstRunTour />

      <div className={styles["nn-conversationScroll"]}>
        {ordered.length === 0 ? (
          <div className={styles["nn-emptyCoach"]}>
            <div className={styles["nn-emptyTitle"]}>Start with one of these prompts:</div>
            <div className={styles["nn-starterGrid"]}>
              <Button
                size="sm"
                variant="subtle"
                onClick={() =>
                  setDraft("Read mode: summarize current policy, pending approvals, and risks.")
                }
              >
                Read: summarize current seat status
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() =>
                  setDraft(
                    "Propose mode: return a skill.proposal JSON for a low-risk wallet/token read."
                  )
                }
              >
                Propose: draft a safe skill.proposal
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() =>
                  setDraft(
                    "Create a strategy draft with objective, constraints, and rollback conditions."
                  )
                }
              >
                Strategy: draft a runbook-ready strategy
              </Button>
            </div>
          </div>
        ) : null}

        {proposals.length === 0 ? (
          <div className={styles["nn-emptyHint"]}>
            Proposals appear here after assistant analysis. Approvals are always manual.
          </div>
        ) : null}

        {ordered.map((message) => {
          const proposal = message.metadata?.proposalId
            ? proposalById.get(message.metadata.proposalId)
            : null;

          return (
            <div
              key={message.id}
              id={`operator-message-${message.id}`}
              className={[styles["nn-messageRow"], styles.messageRow].join(" ")}
            >
              <div className={[styles["nn-message"], roleClassName(message.role)].join(" ")}>
                <div className={[styles["nn-messageMeta"], styles.messageMeta].join(" ")}>
                  <div className={styles["nn-role"]}>{message.role}</div>
                  <div className={styles["nn-time"]}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {message.metadata ? (
                  <div className={styles["nn-tags"]}>
                    {message.metadata.action ? (
                      <span className={styles["nn-chip"]}>{message.metadata.action}</span>
                    ) : null}
                    {(message.metadata.tags || []).slice(0, 4).map((tag) => (
                      <span key={`${message.id}-${tag}`} className={styles["nn-chip"]}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {proposal ? (
                  <ProposalInlineCard
                    proposal={proposal}
                    loadingAction={loadingAction}
                    onApprove={onApprove}
                    onReject={onReject}
                    onRequestIntent={onRequestIntent}
                    onLockIntent={onLockIntent}
                    onGeneratePlan={onGeneratePlan}
                    onExecute={onExecute}
                    onDraftStrategy={onDraftStrategy}
                  />
                ) : (
                  renderMarkdown(message.content)
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={[styles["nn-inputBar"], styles.composer].join(" ")}>
        <div className={styles["nn-composerModes"]}>
          <Tooltip text="Read mode analyzes only.">
            <span
              className={[
                styles["nn-modeChip"],
                activeMode === "READ" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Read
            </span>
          </Tooltip>
          <Tooltip text="Propose mode drafts structured actions.">
            <span
              className={[
                styles["nn-modeChip"],
                activeMode === "PROPOSE" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Propose
            </span>
          </Tooltip>
          <Tooltip text="Execute is locked until approval and intent lock.">
            <span
              className={[
                styles["nn-modeChip"],
                styles["nn-modeLocked"],
                activeMode === "EXECUTE" ? styles["nn-modeActive"] : styles["nn-modeInactive"],
              ].join(" ")}
            >
              Execute
            </span>
          </Tooltip>
          <div className={styles["nn-muted"]}>
            Starters: {skills.length} skills, {strategies.length} strategy templates
          </div>
        </div>

        <Textarea
          data-tour-target="chat-input"
          className={styles["nn-input"]}
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask for analysis, draft a proposal, or create a strategy."
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSend();
            }
          }}
        />

        <div className={styles["nn-actions"]}>
          <div className={styles["nn-muted"]}>Ctrl/Cmd + Enter to send</div>
          <Tooltip text="Send your message to the operator assistant.">
            <span>
              <Button onClick={onSend} disabled={loading || !draft.trim()}>
                {loading ? "Sending..." : "Send"}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
