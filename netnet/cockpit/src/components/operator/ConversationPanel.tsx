"use client";

import { Fragment, useMemo, useState } from "react";
import Insight from "@/components/Insight";
import Tooltip from "@/components/operator/Tooltip";
import type { ThreadItem } from "@/components/operator/ThreadSidebar";
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
  onExecute: (id: string) => void;
  loadingAction: string | null;
  threads: ThreadItem[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
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

  for (let i = 0; i < parts.length; i++) {
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
      const paragraph = buffer.join(" ").trim();
      if (!paragraph) {
        buffer.length = 0;
        return;
      }
      blocks.push(
        <p key={key} dangerouslySetInnerHTML={{ __html: renderInline(paragraph) }} />
      );
      buffer.length = 0;
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();

      if (!line) {
        flushParagraph(`p-${i}-${idx}`);
        continue;
      }

      if (line.startsWith("### ")) {
        flushParagraph(`p-${i}-${idx}-before-h3`);
        blocks.push(
          <h3 key={`h3-${i}-${idx}`} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />
        );
        continue;
      }

      if (line.startsWith("## ")) {
        flushParagraph(`p-${i}-${idx}-before-h2`);
        blocks.push(
          <h4 key={`h4-${i}-${idx}`} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />
        );
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
  onExecute,
}: {
  proposal: SkillProposalEnvelope;
  loadingAction: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestIntent: (id: string) => void;
  onLockIntent: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  return (
    <div className={styles["nn-proposalCard"]}>
      <div className={styles["nn-proposalHead"]}>
        <div>
          <div className={styles["nn-proposalTitle"]}>{proposal.skillId}</div>
          <div className={styles["nn-proposalRoute"]}>{proposal.route}</div>
        </div>
        <div className={styles["nn-chipRow"]}>
          <span className={styles["nn-chip"]}>status: {proposal.status}</span>
          <span className={styles["nn-chip"]}>intent: {proposal.executionIntent}</span>
          <span className={styles["nn-chip"]}>risk: {proposal.riskLevel}</span>
        </div>
      </div>

      <div className={styles["nn-inlineHint"]}>{proposal.reasoning}</div>

      {proposal.executionResult ? (
        <div className={styles["nn-listItem"]}>
          <div>Execution {proposal.executionResult.ok ? "succeeded" : "failed"}</div>
          <div className={styles["nn-muted"]}>
            {proposal.executionResult.route} · {proposal.executionResult.policyDecision}
          </div>
        </div>
      ) : null}

      <div className={styles["nn-actions"]}>
        {proposal.status === "draft" ? (
          <Fragment>
            <Tooltip text="Approve this proposal for execution.">
              <span>
                <Button
                  size="sm"
                  disabled={loadingAction !== null}
                  onClick={() => onApprove(proposal.id)}
                  insight={{
                    what: "Approve confirms this proposal can move to intent stage.",
                    when: "Use after checking route, payload, and risk level.",
                    requires: "Operator decision.",
                    output: "Proposal status changes to approved.",
                  }}
                >
                  {loadingAction === `approve:${proposal.id}` ? "Approving..." : "Approve"}
                </Button>
              </span>
            </Tooltip>
            <Button
              size="sm"
              variant="danger"
              disabled={loadingAction !== null}
              onClick={() => onReject(proposal.id)}
              insight={{
                what: "Reject ends this proposal path.",
                when: "Use if proposal is unsafe or out of scope.",
                requires: "Operator decision.",
                output: "Proposal status changes to rejected.",
              }}
            >
              {loadingAction === `reject:${proposal.id}` ? "Rejecting..." : "Reject"}
            </Button>
          </Fragment>
        ) : null}

        {proposal.status === "approved" && proposal.executionIntent === "none" ? (
          <Button
            size="sm"
            disabled={loadingAction !== null}
            onClick={() => onRequestIntent(proposal.id)}
            insight={{
              what: "Request Intent marks readiness for possible execution.",
              when: "Use after proposal approval.",
              requires: "Approved proposal.",
              output: "executionIntent becomes requested.",
            }}
          >
            {loadingAction === `request:${proposal.id}` ? "Requesting..." : "Request Intent"}
          </Button>
        ) : null}

        {proposal.executionIntent === "requested" ? (
          <Tooltip text="Lock execution intent. Enables execution planning.">
            <span>
              <Button
                size="sm"
                disabled={loadingAction !== null}
                onClick={() => onLockIntent(proposal.id)}
                insight={{
                  what: "Lock prevents accidental intent drift before execution.",
                  when: "Use after final operator review.",
                  requires: "Intent must be requested.",
                  output: "executionIntent becomes locked.",
                }}
              >
                {loadingAction === `lock:${proposal.id}` ? "Locking..." : "Lock Intent"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {proposal.executionIntent === "locked" && proposal.executionStatus === "idle" ? (
          <Tooltip text="Run approved and locked proposal.">
            <span>
              <Button
                size="sm"
                disabled={loadingAction !== null}
                onClick={() => onExecute(proposal.id)}
                insight={{
                  what: "Execute runs through the controlled orchestrator.",
                  when: "Use only after approval and intent lock.",
                  requires: "Policy gate allows execution at runtime.",
                  output: "Execution result envelope and audit message.",
                }}
              >
                {loadingAction === `execute:${proposal.id}` ? "Executing..." : "Execute"}
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
  onExecute,
  loadingAction,
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
}: ConversationPanelProps) {
  const ordered = useMemo(() => [...messages].sort((a, b) => a.createdAt - b.createdAt), [messages]);
  const proposalById = useMemo(
    () => new Map(proposals.map((proposal) => [proposal.id, proposal])),
    [proposals]
  );

  const [showSkills, setShowSkills] = useState(false);
  const [showStrategies, setShowStrategies] = useState(false);

  return (
    <div className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <div className={[styles["nn-sectionHeader"], styles.panelHeader].join(" ")}>
        <div>
          <div className={styles["nn-sectionTitle"]}>Operator Chat</div>
          <div className={styles["nn-muted"]}>Policy mode: {policyMode}</div>
        </div>
        <div className={styles["nn-headerControls"]}>
          <select
            className={styles["nn-threadSelect"]}
            value={activeThreadId ?? ""}
            onChange={(event) => {
              const next = event.target.value;
              if (next) onSelectThread(next);
            }}
            aria-label="Select thread"
          >
            {activeThreadId ? null : <option value="">All messages</option>}
            {threads.map((thread) => (
              <option key={thread.id} value={thread.id}>
                {thread.title} ({thread.messageCount})
              </option>
            ))}
          </select>
          <Tooltip text="Create a fresh conversation thread.">
            <span>
              <Button size="sm" onClick={onCreateThread}>
                New
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      <div className={styles["nn-toolbarRow"]}>
        <div className={styles["nn-chipRow"]}>
          <Button size="sm" variant="subtle" onClick={() => setShowSkills((prev) => !prev)}>
            {showSkills ? "Hide Skills" : "Skills"}
          </Button>
          <Button size="sm" variant="subtle" onClick={() => setShowStrategies((prev) => !prev)}>
            {showStrategies ? "Hide Strategies" : "Strategies"}
          </Button>
        </div>
        <div className={styles["nn-muted"]}>Threaded, proposal-first workflow.</div>
      </div>

      <div className={styles["nn-guidanceStrip"]}>
        You can: ask questions, propose strategies, draft actions, and approve then execute proposals.
      </div>

      {showSkills ? (
        <div className={styles["nn-starterList"]}>
          <div className={styles["nn-muted"]}>Skill starters</div>
          <div className={styles["nn-starterGrid"]}>
            {skills.slice(0, 8).map((skill) => (
              <Button
                key={skill.id}
                size="sm"
                variant="subtle"
                onClick={() =>
                  setDraft(
                    `Consider skill: ${skill.id}. Return only skill.proposal JSON for ${skill.route} with reasoning, riskLevel, and proposedBody. No execution.`
                  )
                }
              >
                {skill.id}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {showStrategies ? (
        <div className={styles["nn-starterList"]}>
          <div className={styles["nn-muted"]}>Strategy starters</div>
          <div className={styles["nn-starterGrid"]}>
            {strategies.slice(0, 10).map((strategy) => (
              <Button
                key={strategy.id}
                size="sm"
                variant="subtle"
                onClick={() => setDraft(strategy.starterPrompt)}
              >
                {strategy.title}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles["nn-conversationScroll"]}>
        {ordered.length === 0 ? (
          <div className={styles["nn-emptyCoach"]}>
            <div>Start by describing what you want to accomplish.</div>
            <div className={styles["nn-muted"]}>
              The Operator will analyze, propose structured actions, and wait for approval.
            </div>
          </div>
        ) : null}
        {ordered.map((message) => {
          const proposal = message.metadata?.proposalId
            ? proposalById.get(message.metadata.proposalId)
            : null;

          return (
            <div
              key={message.id}
              className={[styles["nn-messageRow"], styles.messageRow].join(" ")}
            >
              <div
                className={[styles["nn-message"], roleClassName(message.role)].join(" ")}
              >
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
                    {message.metadata.policySnapshot ? (
                      <span className={styles["nn-chip"]}>policy snapshot</span>
                    ) : null}
                    {(message.metadata.tags || []).map((tag) => (
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
                    onExecute={onExecute}
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
        <Insight
          insight={{
            what: "Write your operator instruction for analysis or proposal drafting.",
            when: "Use before sending a new command to the assistant.",
            requires: "No execution from chat send alone.",
            output: "Assistant response and optional proposal envelope.",
          }}
        >
          <div>
            <Textarea
              className={styles["nn-input"]}
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask for strategy analysis or a skill.proposal JSON draft..."
            />
          </div>
        </Insight>

        <div className={styles["nn-actions"]}>
          <Tooltip text="Send instruction to Operator AI.">
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
