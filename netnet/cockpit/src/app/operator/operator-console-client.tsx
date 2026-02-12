"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import ConversationPanel from "@/components/operator/ConversationPanel";
import OperatorTopBar from "@/components/operator/OperatorTopBar";
import OpsBoard from "@/components/operator/OpsBoard";
import type { ThreadItem } from "@/components/operator/ThreadSidebar";
import { Button, Textarea } from "@/components/ui";
import styles from "@/components/operator/OperatorSeat.module.css";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { Strategy } from "@/lib/operator/strategy";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";
import {
  approveProposalAction,
  createBankrDraftAction,
  createDraftProposalFromTemplate,
  executeProposalAction,
  generateExecutionPlanAction,
  lockExecutionIntentAction,
  proposeFromBankrDraftAction,
  proposeStrategyFromAssistantProposal,
  rejectProposalAction,
  requestExecutionIntentAction,
  sendOperatorMessageAction,
  type OperatorStateResponse,
} from "./actions";

type Props = {
  initialMessages: MessageEnvelope[];
  initialProposals: SkillProposalEnvelope[];
  initialStrategies: Strategy[];
  initialPnl: OperatorStateResponse["pnl"];
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  policyMode: string;
  policyHealthy: boolean;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
};

type DraftThread = {
  id: string;
  createdAt: number;
};

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function trimLine(input: string): string {
  const oneLine = input.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Untitled thread";
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}...` : oneLine;
}

function buildPersistedThreads(
  messages: MessageEnvelope[],
  assignments: Record<string, string>
): ThreadItem[] {
  const groups = new Map<string, MessageEnvelope[]>();
  const ordered = [...messages].sort((a, b) => a.createdAt - b.createdAt);

  for (const message of ordered) {
    if (assignments[message.id]) continue;
    const id = `day:${dayKey(message.createdAt)}`;
    const existing = groups.get(id);
    if (existing) existing.push(message);
    else groups.set(id, [message]);
  }

  return [...groups.entries()]
    .map(([id, threadMessages]) => {
      const first = threadMessages.find(
        (message) => message.role === "operator" || message.role === "assistant" || message.role === "system"
      );
      const last = threadMessages[threadMessages.length - 1];
      return {
        id,
        title: trimLine(first?.content || "Thread"),
        updatedAt: last?.createdAt || Date.now(),
        messageCount: threadMessages.length,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function buildDraftThreads(
  drafts: DraftThread[],
  messages: MessageEnvelope[],
  assignments: Record<string, string>
): ThreadItem[] {
  return drafts
    .map((draft) => {
      const assigned = messages
        .filter((message) => assignments[message.id] === draft.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      const first = assigned.find((message) => message.role === "operator" || message.role === "assistant");
      const last = assigned[assigned.length - 1];

      return {
        id: draft.id,
        title: trimLine(first?.content || "New thread"),
        updatedAt: last?.createdAt || draft.createdAt,
        messageCount: assigned.length,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function OperatorConsoleClient({
  initialMessages,
  initialProposals,
  initialStrategies,
  initialPnl,
  skills,
  strategies,
  policyMode,
  policyHealthy,
  dbConnected,
  engineType,
}: Props) {
  const [messages, setMessages] = useState<MessageEnvelope[]>(initialMessages);
  const [proposals, setProposals] = useState<SkillProposalEnvelope[]>(initialProposals);
  const [strategyMemory, setStrategyMemory] = useState<Strategy[]>(initialStrategies);
  const [pnl, setPnl] = useState(initialPnl);
  const [draft, setDraft] = useState("");
  const [bankrDraftText, setBankrDraftText] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [threadAssignments, setThreadAssignments] = useState<Record<string, string>>({});
  const [draftThreads, setDraftThreads] = useState<DraftThread[]>([]);
  const [pending, startTransition] = useTransition();
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((message) => message.id))
  );

  const persistedThreads = useMemo(
    () => buildPersistedThreads(messages, threadAssignments),
    [messages, threadAssignments]
  );

  const syntheticThreads = useMemo(
    () => buildDraftThreads(draftThreads, messages, threadAssignments),
    [draftThreads, messages, threadAssignments]
  );

  const threads = useMemo(
    () => [...syntheticThreads, ...persistedThreads].sort((a, b) => b.updatedAt - a.updatedAt),
    [persistedThreads, syntheticThreads]
  );

  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    () => buildPersistedThreads(initialMessages, {})[0]?.id || null
  );

  const filteredMessages = useMemo(() => {
    if (!activeThreadId) return [...messages].sort((a, b) => a.createdAt - b.createdAt);

    if (activeThreadId.startsWith("draft:")) {
      return messages
        .filter((message) => threadAssignments[message.id] === activeThreadId)
        .sort((a, b) => a.createdAt - b.createdAt);
    }

    const selectedDay = activeThreadId.replace("day:", "");
    return messages
      .filter(
        (message) =>
          !threadAssignments[message.id] && dayKey(message.createdAt) === selectedDay
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [activeThreadId, messages, threadAssignments]);

  function applyState(next: OperatorStateResponse, targetThreadId: string | null) {
    const seen = seenMessageIdsRef.current;
    const newMessages = next.messages.filter((message) => !seen.has(message.id));
    seenMessageIdsRef.current = new Set(next.messages.map((message) => message.id));

    if (targetThreadId && targetThreadId.startsWith("draft:") && newMessages.length > 0) {
      setThreadAssignments((prev) => {
        const updated = { ...prev };
        for (const message of newMessages) updated[message.id] = targetThreadId;
        return updated;
      });
    }

    setMessages(next.messages);
    setProposals(next.proposals);
    setStrategyMemory(next.strategies);
    setPnl(next.pnl);
  }

  function runAction(
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null = activeThreadId
  ) {
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const next = await fn();
        applyState(next, targetThreadId);
      } finally {
        setLoadingAction(null);
      }
    });
  }

  async function runActionNow(
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null = activeThreadId
  ): Promise<void> {
    setLoadingAction(actionKey);
    try {
      const next = await fn();
      applyState(next, targetThreadId);
    } finally {
      setLoadingAction(null);
    }
  }

  function onSend() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    runAction("send", () => sendOperatorMessageAction(value), activeThreadId);
  }

  function onCreateThread() {
    const id = `draft:${Date.now()}`;
    setDraftThreads((prev) => [{ id, createdAt: Date.now() }, ...prev]);
    setActiveThreadId(id);
    setDraft("");
  }

  function onCreateBankrDraft() {
    const text = bankrDraftText.trim();
    if (!text) return;
    setBankrDraftText("");
    runAction("bankr-draft:create", () => createBankrDraftAction(text), activeThreadId);
  }

  function onSelectThread(id: string) {
    setActiveThreadId(id);
  }

  return (
    <div className={[styles["nn-root"], styles.seat].join(" ")}>
      <OperatorTopBar
        policyMode={policyMode}
        dbConnected={dbConnected}
        engineType={engineType}
        policyHealthy={policyHealthy}
      />

      <div className={styles["nn-main"]}>
        <section className={[styles.left, styles.panel].join(" ")}>
          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>
                <div>Bankr Draft</div>
                <div className={styles["nn-muted"]}>
                  Draft strategy intent from chat text, then propose from Ops Board.
                </div>
              </div>
              <Button
                size="sm"
                onClick={onCreateBankrDraft}
                disabled={!bankrDraftText.trim() || loadingAction !== null}
              >
                {loadingAction === "bankr-draft:create" ? "Creating..." : "Create Draft"}
              </Button>
            </div>
            <Textarea
              rows={2}
              value={bankrDraftText}
              onChange={(event) => setBankrDraftText(event.target.value)}
              placeholder="Example: Draft a daily DCA for ECO on base with conservative sizing."
            />
          </div>
          <ConversationPanel
            messages={filteredMessages}
            proposals={proposals}
            draft={draft}
            setDraft={setDraft}
            onSend={onSend}
            loading={pending && loadingAction === "send"}
            policyMode={policyMode}
            skills={skills}
            strategies={strategies}
            onApprove={(id) => runAction(`approve:${id}`, () => approveProposalAction(id))}
            onReject={(id) => runAction(`reject:${id}`, () => rejectProposalAction(id))}
            onRequestIntent={(id) => runAction(`request:${id}`, () => requestExecutionIntentAction(id))}
            onLockIntent={(id) => runAction(`lock:${id}`, () => lockExecutionIntentAction(id))}
            onGeneratePlan={(id) =>
              runAction(`plan:${id}`, () => generateExecutionPlanAction(id))
            }
            onExecute={(id) => runAction(`execute:${id}`, () => executeProposalAction(id))}
            onDraftStrategy={(id) =>
              runAction(`strategy:${id}`, () => proposeStrategyFromAssistantProposal(id))
            }
            loadingAction={loadingAction}
            threads={threads}
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
            onCreateThread={onCreateThread}
          />
        </section>

        <aside className={[styles.right, styles.panel].join(" ")}>
          <OpsBoard
            proposals={proposals}
            messages={messages}
            strategies={strategyMemory}
            pnl={pnl}
            policyMode={policyMode}
            onCreateDraftProposal={(templateId, input) =>
              runActionNow(
                `template:${templateId}`,
                () => createDraftProposalFromTemplate(templateId, input),
                activeThreadId
              )
            }
            onProposeBankrDraft={(strategyId) =>
              runActionNow(
                `bankr-draft:propose:${strategyId}`,
                () => proposeFromBankrDraftAction(strategyId),
                activeThreadId
              )
            }
            loadingAction={loadingAction}
          />
        </aside>
      </div>
    </div>
  );
}
