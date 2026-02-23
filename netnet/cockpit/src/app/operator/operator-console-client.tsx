"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import ConversationPanel from "@/components/operator/ConversationPanel";
import InspectorPanel, {
  type OperatorInspectorSelection,
} from "@/components/operator/InspectorPanel";
import OperatorTopBar from "@/components/operator/OperatorTopBar";
import OpsBoard from "@/components/operator/OpsBoard";
import ThreadSidebar, { type ThreadItem } from "@/components/operator/ThreadSidebar";
import styles from "@/components/operator/OperatorSeat.module.css";
import { Button } from "@/components/ui";
import {
  loadOperatorLayout,
  saveOperatorLayout,
  type OperatorLayoutMode,
} from "@/lib/operator/layout";
import type { SkillInfo } from "@/lib/operator/skillContext";
import type { Strategy } from "@/lib/operator/strategy";
import type { OperatorStrategyTemplate } from "@/lib/operator/strategies";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";
import { useClarity } from "@/lib/operator/useClarity";
import type { OperatorWalletProfile } from "@/lib/operator/walletProfiles";
import {
  approveProposalAction,
  createBankrDraftAction,
  createDraftProposalFromTemplate,
  executeProposalAction,
  generateExecutionPlanAction,
  lockExecutionIntentAction,
  pinStrategyAction,
  proposeFromBankrDraftAction,
  proposeStrategyFromAssistantProposal,
  rejectProposalAction,
  runBankrPlanSweepAction,
  runBankrPrepSweepAction,
  runBankrSimulationSweepAction,
  runBankrPreflightSweepAction,
  runBankrPreflightAction,
  requestExecutionIntentAction,
  sendOperatorMessageAction,
  setActiveWalletProfileAction,
  simulateBankrProposalAction,
  unpinStrategyAction,
  updateStrategyRunbookAction,
  type OperatorStateResponse,
} from "./actions";

type Props = {
  initialMessages: MessageEnvelope[];
  initialProposals: SkillProposalEnvelope[];
  initialStrategies: Strategy[];
  initialPnl: OperatorStateResponse["pnl"];
  initialWalletProfiles: OperatorWalletProfile[];
  initialActiveWalletProfileId: string | null;
  skills: SkillInfo[];
  strategies: OperatorStrategyTemplate[];
  policyMode: string;
  policyHealthy: boolean;
  dbConnected: boolean;
  engineType: "openrouter" | "local";
  engineModel: string;
};

type DraftThread = {
  id: string;
  createdAt: number;
};

type MobilePanelKey = "ops" | "threads" | "inspector";
const HELP_DISMISSED_KEY = "nn.operator.helpDismissed";

function dayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function trimLine(input: string): string {
  const oneLine = input.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Untitled session";
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
        (message) =>
          message.role === "operator" ||
          message.role === "assistant" ||
          message.role === "system"
      );
      const last = threadMessages[threadMessages.length - 1];
      return {
        id,
        title: trimLine(first?.content || "Session"),
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

      const first = assigned.find(
        (message) => message.role === "operator" || message.role === "assistant"
      );
      const last = assigned[assigned.length - 1];

      return {
        id: draft.id,
        title: trimLine(first?.content || "New chat"),
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
  initialWalletProfiles,
  initialActiveWalletProfileId,
  skills,
  strategies,
  policyMode,
  policyHealthy,
  dbConnected,
  engineType,
  engineModel,
}: Props) {
  const { clarity, setClarity } = useClarity();
  const [messages, setMessages] = useState<MessageEnvelope[]>(initialMessages);
  const [proposals, setProposals] = useState<SkillProposalEnvelope[]>(initialProposals);
  const [strategyMemory, setStrategyMemory] = useState<Strategy[]>(initialStrategies);
  const [pnl, setPnl] = useState(initialPnl);
  const [walletProfiles, setWalletProfiles] = useState<OperatorWalletProfile[]>(
    initialWalletProfiles
  );
  const [activeWalletProfileId, setActiveWalletProfileId] = useState<string | null>(
    initialActiveWalletProfileId
  );
  const [draft, setDraft] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [threadAssignments, setThreadAssignments] = useState<Record<string, string>>({});
  const [draftThreads, setDraftThreads] = useState<DraftThread[]>([]);
  const [layoutMode, setLayoutMode] = useState<OperatorLayoutMode>(() => loadOperatorLayout());
  const [selected, setSelected] = useState<OperatorInspectorSelection>({ kind: "none" });
  const [compactLayout, setCompactLayout] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobilePanels, setMobilePanels] = useState<Record<MobilePanelKey, boolean>>({
    ops: true,
    threads: false,
    inspector: false,
  });
  const [pending, startTransition] = useTransition();
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((message) => message.id))
  );

  useEffect(() => {
    saveOperatorLayout(layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompactLayout(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(HELP_DISMISSED_KEY) === "1";
    if (clarity === "beginner" && !dismissed) {
      setHelpOpen(true);
    }
  }, [clarity]);

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

  const applyState = useCallback((next: OperatorStateResponse, targetThreadId: string | null) => {
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
    setWalletProfiles(next.walletProfiles);
    setActiveWalletProfileId(next.activeWalletProfileId);
  }, []);

  const runAction = useCallback((
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null
  ) => {
    setLoadingAction(actionKey);
    startTransition(async () => {
      try {
        const next = await fn();
        applyState(next, targetThreadId);
      } finally {
        setLoadingAction(null);
      }
    });
  }, [applyState, startTransition]);

  const runActionNow = useCallback(async (
    actionKey: string,
    fn: () => Promise<OperatorStateResponse>,
    targetThreadId: string | null
  ): Promise<void> => {
    setLoadingAction(actionKey);
    try {
      const next = await fn();
      applyState(next, targetThreadId);
    } finally {
      setLoadingAction(null);
    }
  }, [applyState]);

  const onSend = useCallback(() => {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    const optimisticId = `optimistic-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticMessage: MessageEnvelope = {
      id: optimisticId,
      role: "operator",
      content: value,
      createdAt: Date.now(),
      metadata: {
        action: "chat",
        tags: ["operator-input", "pending"],
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    if (activeThreadId?.startsWith("draft:")) {
      setThreadAssignments((prev) => ({
        ...prev,
        [optimisticId]: activeThreadId,
      }));
    }
    runAction("send", () => sendOperatorMessageAction(value), activeThreadId);
  }, [activeThreadId, draft, runAction]);

  const handleInsertPrompt = useCallback((text: string) => {
    setDraft(text);
  }, []);

  const onCreateThread = useCallback(() => {
    const id = `draft:${Date.now()}`;
    setDraftThreads((prev) => [{ id, createdAt: Date.now() }, ...prev]);
    setActiveThreadId(id);
    setDraft("");
  }, []);

  const onSelectThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const resolveThreadIdForMessage = useCallback((message: MessageEnvelope): string => {
    const assigned = threadAssignments[message.id];
    if (assigned) return assigned;
    return `day:${dayKey(message.createdAt)}`;
  }, [threadAssignments]);

  const pulse = useCallback((target: HTMLElement | null) => {
    if (!target) return;
    target.classList.add(styles["nn-focusPulse"]);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.classList.remove(styles["nn-focusPulse"]), 1400);
  }, []);

  const focusProposal = useCallback((proposalId: string) => {
    const proposalMessage = messages.find((message) => message.metadata?.proposalId === proposalId);
    if (proposalMessage) {
      const nextThreadId = resolveThreadIdForMessage(proposalMessage);
      if (activeThreadId !== nextThreadId) setActiveThreadId(nextThreadId);
    }

    window.setTimeout(() => {
      const proposalNode = document.getElementById(`operator-proposal-${proposalId}`);
      if (proposalNode) {
        pulse(proposalNode);
        return;
      }
      if (proposalMessage) {
        const messageNode = document.getElementById(`operator-message-${proposalMessage.id}`);
        pulse(messageNode);
      }
    }, 60);
  }, [activeThreadId, messages, pulse, resolveThreadIdForMessage]);

  const focusMessage = useCallback((messageId: string) => {
    const message = messages.find((entry) => entry.id === messageId);
    if (message) {
      const nextThreadId = resolveThreadIdForMessage(message);
      if (activeThreadId !== nextThreadId) setActiveThreadId(nextThreadId);
    }

    window.setTimeout(() => {
      const node = document.getElementById(`operator-message-${messageId}`);
      pulse(node);
    }, 60);
  }, [activeThreadId, messages, pulse, resolveThreadIdForMessage]);

  const handleApprove = useCallback(
    (id: string) => runAction(`approve:${id}`, () => approveProposalAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleReject = useCallback(
    (id: string) => runAction(`reject:${id}`, () => rejectProposalAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleRequestIntent = useCallback(
    (id: string) =>
      runAction(`request:${id}`, () => requestExecutionIntentAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleLockIntent = useCallback(
    (id: string) => runAction(`lock:${id}`, () => lockExecutionIntentAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleGeneratePlan = useCallback(
    (id: string) => runAction(`plan:${id}`, () => generateExecutionPlanAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleExecute = useCallback(
    (id: string) => runAction(`execute:${id}`, () => executeProposalAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleSimulate = useCallback(
    (id: string) =>
      runAction(`simulate:${id}`, () => simulateBankrProposalAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handlePreflight = useCallback(
    (id: string) =>
      runAction(`preflight:${id}`, () => runBankrPreflightAction(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handlePreflightSweep = useCallback(
    () =>
      runActionNow(
        "preflight:sweep",
        () => runBankrPreflightSweepAction(),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handlePlanSweep = useCallback(
    () =>
      runActionNow(
        "plan:sweep",
        () => runBankrPlanSweepAction(),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handlePrepSweep = useCallback(
    () =>
      runActionNow(
        "prep:sweep",
        () => runBankrPrepSweepAction(),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleSimulationSweep = useCallback(
    () =>
      runActionNow(
        "simulation:sweep",
        () => runBankrSimulationSweepAction(),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleDraftStrategy = useCallback(
    (id: string) =>
      runAction(`strategy:${id}`, () => proposeStrategyFromAssistantProposal(id), activeThreadId),
    [activeThreadId, runAction]
  );

  const handleCreateTemplateProposal = useCallback(
    (templateId: string, input: Record<string, string>) =>
      runActionNow(
        `template:${templateId}`,
        () => createDraftProposalFromTemplate(templateId, input),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleCreateBankrDraft = useCallback(
    (text: string) =>
      runActionNow("bankr-draft:create", () => createBankrDraftAction(text), activeThreadId),
    [activeThreadId, runActionNow]
  );

  const handleProposeBankrDraft = useCallback(
    (strategyId: string) =>
      runActionNow(
        `bankr-draft:propose:${strategyId}`,
        () => proposeFromBankrDraftAction(strategyId),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handlePinStrategy = useCallback(
    (strategyId: string) =>
      runActionNow(`strategy:pin:${strategyId}`, () => pinStrategyAction(strategyId), activeThreadId),
    [activeThreadId, runActionNow]
  );

  const handleUnpinStrategy = useCallback(
    (strategyId: string) =>
      runActionNow(
        `strategy:unpin:${strategyId}`,
        () => unpinStrategyAction(strategyId),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleUpdateRunbook = useCallback(
    (strategyId: string, markdown: string) =>
      runActionNow(
        `strategy:runbook:${strategyId}`,
        () => updateStrategyRunbookAction(strategyId, markdown),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleSetActiveWalletProfile = useCallback(
    (profileId: string) =>
      runActionNow(
        `wallet:active:${profileId}`,
        () => setActiveWalletProfileAction(profileId),
        activeThreadId
      ),
    [activeThreadId, runActionNow]
  );

  const handleSelectMessage = useCallback((messageId: string) => {
    setSelected({ kind: "message", id: messageId });
  }, []);

  const handleSelectProposal = useCallback((proposalId: string) => {
    setSelected({ kind: "proposal", id: proposalId });
  }, []);

  const handleSelectExecution = useCallback((proposalId: string) => {
    setSelected({ kind: "execution", id: proposalId });
  }, []);

  const handleSelectStrategy = useCallback((strategyId: string) => {
    setSelected({ kind: "strategy", id: strategyId });
  }, []);

  const toggleMobilePanel = useCallback((panel: MobilePanelKey) => {
    setMobilePanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const toggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const dismissHelp = useCallback(() => {
    setHelpOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HELP_DISMISSED_KEY, "1");
    }
  }, []);

  return (
    <div className={[styles["nn-root"], styles.seat].join(" ")}>
      <div
        className={[
          styles["nn-main"],
          compactLayout ? styles["nn-mainMobile"] : styles["nn-mainTwoPane"],
        ].join(" ")}
      >
        <section className={[styles["nn-center"], styles.panel, styles["nn-centerColumn"]].join(" ")}>
          <OperatorTopBar
            policyMode={policyMode}
            dbConnected={dbConnected}
            engineType={engineType}
            engineModel={engineModel}
            policyHealthy={policyHealthy}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            clarity={clarity}
            onClarityChange={setClarity}
            helpOpen={helpOpen}
            onToggleHelp={toggleHelp}
            walletProfiles={walletProfiles}
            activeWalletProfileId={activeWalletProfileId}
            onActiveWalletProfileChange={handleSetActiveWalletProfile}
          />
          {helpOpen ? (
            <div className={styles["nn-helpPanel"]}>
              <div className={styles["nn-helpTitle"]}>What am I looking at?</div>
              <div className={styles["nn-helpList"]}>
                <div>
                  <strong>Read / Propose / Execute</strong>: Read analyzes, Propose drafts, Execute only runs
                  after approval + lock + plan.
                </div>
                <div>
                  <strong>Proposal</strong>: Structured action draft from the assistant that you explicitly approve or
                  reject.
                </div>
                <div>
                  <strong>Lock intent</strong>: Final operator confirmation before execution path unlocks.
                </div>
              </div>
              <div className={styles["nn-helpActions"]}>
                <Button size="sm" variant="subtle" onClick={dismissHelp}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          <div className={styles["nn-conversationPane"]}>
            <ConversationPanel
              messages={filteredMessages}
              proposals={proposals}
              draft={draft}
              setDraft={setDraft}
              onSend={onSend}
              loading={pending && loadingAction === "send"}
              policyMode={policyMode}
              clarity={clarity}
              skills={skills}
              strategies={strategies}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestIntent={handleRequestIntent}
              onLockIntent={handleLockIntent}
              onGeneratePlan={handleGeneratePlan}
              onExecute={handleExecute}
              onSimulate={handleSimulate}
              onPreflight={handlePreflight}
              onDraftStrategy={handleDraftStrategy}
              onSelectProposal={handleSelectProposal}
              onSelectMessage={handleSelectMessage}
              selected={selected}
              loadingAction={loadingAction}
            />
          </div>
        </section>

        {!compactLayout ? (
          <aside className={[styles.right, styles.panel, styles["nn-opsColumn"]].join(" ")}>
            <OpsBoard
              proposals={proposals}
              messages={messages}
              strategies={strategyMemory}
              pnl={pnl}
              policyMode={policyMode}
              clarity={clarity}
              onCreateDraftProposal={handleCreateTemplateProposal}
              onCreateBankrDraft={handleCreateBankrDraft}
              onRunPreflightSweep={handlePreflightSweep}
              onRunPlanSweep={handlePlanSweep}
              onRunPrepSweep={handlePrepSweep}
              onRunSimulationSweep={handleSimulationSweep}
              onProposeBankrDraft={handleProposeBankrDraft}
              onPinStrategy={handlePinStrategy}
              onUnpinStrategy={handleUnpinStrategy}
              onUpdateRunbook={handleUpdateRunbook}
              onInsertPrompt={handleInsertPrompt}
              onFocusProposal={focusProposal}
              onFocusMessage={focusMessage}
              onSelectProposal={handleSelectProposal}
              onSelectExecution={handleSelectExecution}
              onSelectStrategy={handleSelectStrategy}
              onSelectMessage={handleSelectMessage}
              selected={selected}
              loadingAction={loadingAction}
            />
          </aside>
        ) : null}
      </div>

      {compactLayout ? (
        <div className={styles["nn-mobileDrawerStack"]}>
          <div className={styles["nn-mobileToggles"]}>
            <Button
              size="sm"
              variant={mobilePanels.ops ? "solid" : "subtle"}
              onClick={() => toggleMobilePanel("ops")}
            >
              Ops
            </Button>
            <Button
              size="sm"
              variant={mobilePanels.threads ? "solid" : "subtle"}
              onClick={() => toggleMobilePanel("threads")}
            >
              Threads
            </Button>
            <Button
              size="sm"
              variant={mobilePanels.inspector ? "solid" : "subtle"}
              onClick={() => toggleMobilePanel("inspector")}
            >
              Inspector
            </Button>
          </div>

          {mobilePanels.ops ? (
            <aside className={[styles.panel, styles["nn-mobileSection"]].join(" ")}>
              <OpsBoard
                proposals={proposals}
                messages={messages}
                strategies={strategyMemory}
                pnl={pnl}
                policyMode={policyMode}
                clarity={clarity}
                onCreateDraftProposal={handleCreateTemplateProposal}
                onCreateBankrDraft={handleCreateBankrDraft}
                onRunPreflightSweep={handlePreflightSweep}
                onRunPlanSweep={handlePlanSweep}
                onRunPrepSweep={handlePrepSweep}
                onRunSimulationSweep={handleSimulationSweep}
                onProposeBankrDraft={handleProposeBankrDraft}
                onPinStrategy={handlePinStrategy}
                onUnpinStrategy={handleUnpinStrategy}
                onUpdateRunbook={handleUpdateRunbook}
                onInsertPrompt={handleInsertPrompt}
                onFocusProposal={focusProposal}
                onFocusMessage={focusMessage}
                onSelectProposal={handleSelectProposal}
                onSelectExecution={handleSelectExecution}
                onSelectStrategy={handleSelectStrategy}
                onSelectMessage={handleSelectMessage}
                selected={selected}
                loadingAction={loadingAction}
              />
            </aside>
          ) : null}

          {mobilePanels.threads ? (
            <aside className={[styles.panel, styles["nn-sidebar"], styles["nn-mobileSection"]].join(" ")}>
              <ThreadSidebar
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={onSelectThread}
                onCreateThread={onCreateThread}
                clarity={clarity}
              />
            </aside>
          ) : null}

          {mobilePanels.inspector ? (
            <aside className={[styles.panel, styles["nn-mobileSection"]].join(" ")}>
              <InspectorPanel
                selected={selected}
                data={{ messages, proposals, strategies: strategyMemory }}
              />
            </aside>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
