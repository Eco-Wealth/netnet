"use client";

import { useMemo, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import Tooltip from "@/components/operator/Tooltip";
import styles from "@/components/operator/OperatorSeat.module.css";
import {
  fetchBankrTokenInfoSnapshot,
  fetchBankrWalletSnapshot,
  type BankrTokenInfoParams,
} from "@/app/operator/actions";
import {
  listBankrTemplates,
  type BankrTemplateId,
} from "@/lib/operator/templates/bankr";
import { isBankrStrategyAction, type Strategy } from "@/lib/operator/strategy";
import type { MessageEnvelope, SkillProposalEnvelope } from "@/lib/operator/types";

type OpsBoardProps = {
  proposals: SkillProposalEnvelope[];
  messages: MessageEnvelope[];
  strategies: Strategy[];
  pnl: {
    last24h: { sinceMs: number; count: number; usdIn: number; usdOut: number; net: number };
    last7d: { sinceMs: number; count: number; usdIn: number; usdOut: number; net: number };
  };
  policyMode: string;
  onCreateDraftProposal: (templateId: string, input: Record<string, string>) => Promise<void>;
  onCreateBankrDraft: (text: string) => Promise<void>;
  onProposeBankrDraft: (strategyId: string) => Promise<void>;
  onPinStrategy: (strategyId: string) => Promise<void>;
  onUnpinStrategy: (strategyId: string) => Promise<void>;
  onUpdateRunbook: (strategyId: string, markdown: string) => Promise<void>;
  onFocusProposal: (proposalId: string) => void;
  onFocusMessage: (messageId: string) => void;
  loadingAction: string | null;
};

type SectionKey =
  | "policy"
  | "pending"
  | "ready"
  | "results"
  | "strategies"
  | "pnl";

const DEFAULT_OPEN: Record<SectionKey, boolean> = {
  policy: true,
  pending: true,
  ready: true,
  results: true,
  strategies: true,
  pnl: true,
};

const BANKR_TEMPLATE_FIELDS: Record<
  BankrTemplateId,
  Array<{ key: string; label: string; placeholder: string }>
> = {
  bankr_dca: [
    { key: "token", label: "token", placeholder: "ECO" },
    { key: "amount", label: "amount", placeholder: "100" },
    { key: "cadence", label: "cadence", placeholder: "daily" },
    { key: "venue", label: "venue", placeholder: "bankr" },
  ],
  bankr_lp_probe: [
    { key: "pair", label: "pair", placeholder: "ECO/USDC" },
    { key: "amount", label: "amount", placeholder: "250" },
    { key: "feeTier", label: "fee tier", placeholder: "0.3%" },
    { key: "range", label: "range", placeholder: "balanced" },
    { key: "venue", label: "venue", placeholder: "bankr" },
  ],
  bankr_rebalance: [
    { key: "portfolio", label: "portfolio", placeholder: "treasury" },
    { key: "target", label: "target", placeholder: "40/40/20" },
    { key: "constraints", label: "constraints", placeholder: "policy caps" },
  ],
  bankr_wallet_snapshot: [{ key: "wallet", label: "wallet", placeholder: "0x..." }],
};

function Section({
  id,
  title,
  help,
  open,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  help: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={styles["nn-collapsible"]}>
      <div className={styles["nn-collapseHeader"]}>
        <Tooltip text={help}>
          <span className={styles["nn-sectionTitle"]}>{title}</span>
        </Tooltip>
        <Button size="sm" variant="subtle" onClick={onToggle}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? <div className={styles["nn-collapseBody"]}>{children}</div> : null}
    </section>
  );
}

function renderRunbookMarkdown(markdown: string): JSX.Element {
  const lines = markdown.split("\n");
  const nodes: JSX.Element[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (key: string) => {
    if (!paragraph.length) return;
    nodes.push(
      <p key={key} className={styles["nn-muted"]}>
        {paragraph.join(" ")}
      </p>
    );
    paragraph = [];
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    if (!line) {
      flushParagraph(`p-${idx}`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph(`h2-${idx}`);
      nodes.push(<h4 key={`h2-${idx}`}>{line.slice(3)}</h4>);
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph(`ul-${idx}`);
      const items: string[] = [line.slice(2)];
      let cursor = idx + 1;
      while (cursor < lines.length && lines[cursor].trim().startsWith("- ")) {
        items.push(lines[cursor].trim().slice(2));
        cursor += 1;
      }
      nodes.push(
        <ul key={`ul-list-${idx}`}>
          {items.map((item, itemIndex) => (
            <li key={`uli-${idx}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
      idx = cursor - 1;
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph("p-tail");
  return <div className={styles["nn-markdown"]}>{nodes}</div>;
}

export default function OpsBoard({
  proposals,
  messages,
  strategies,
  pnl,
  policyMode,
  onCreateDraftProposal,
  onCreateBankrDraft,
  onProposeBankrDraft,
  onPinStrategy,
  onUnpinStrategy,
  onUpdateRunbook,
  onFocusProposal,
  onFocusMessage,
  loadingAction,
}: OpsBoardProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN);
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    []
  );
  const templates = useMemo(() => listBankrTemplates(), []);
  const [selectedTemplate, setSelectedTemplate] = useState<BankrTemplateId>(
    () => templates[0]?.id ?? "bankr_dca"
  );
  const [templateInput, setTemplateInput] = useState<Record<string, string>>({});
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string>("");
  const [bankrDraftText, setBankrDraftText] = useState("");
  const [bankrDraftBusy, setBankrDraftBusy] = useState(false);
  const [bankrDraftNotice, setBankrDraftNotice] = useState<string>("");
  const [draftProposeError, setDraftProposeError] = useState<string | null>(null);
  const [openRunbooks, setOpenRunbooks] = useState<Record<string, boolean>>({});
  const [runbookDrafts, setRunbookDrafts] = useState<Record<string, string>>({});
  const [runbookNotice, setRunbookNotice] = useState<string | null>(null);
  const [runbookError, setRunbookError] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [walletSnapshot, setWalletSnapshot] = useState<any | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletUpdatedAt, setWalletUpdatedAt] = useState<number | null>(null);
  const [tokenSnapshot, setTokenSnapshot] = useState<any | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<number | null>(null);
  const [tokenQuery, setTokenQuery] = useState<BankrTokenInfoParams>({
    chain: "base",
    token: "USDC",
  });

  const pendingApprovals = useMemo(
    () => proposals.filter((proposal) => proposal.status === "draft"),
    [proposals]
  );
  const readyToExecute = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          proposal.status === "approved" &&
          proposal.executionIntent === "locked" &&
          proposal.executionStatus === "idle"
      ),
    [proposals]
  );
  const running = useMemo(
    () => proposals.filter((proposal) => proposal.executionStatus === "running"),
    [proposals]
  );
  const recentResults = useMemo(
    () =>
      proposals
        .filter(
          (proposal) =>
            proposal.executionStatus === "completed" || proposal.executionStatus === "failed"
        )
        .sort((a, b) => (b.executionCompletedAt || 0) - (a.executionCompletedAt || 0))
        .slice(0, 8),
    [proposals]
  );
  const sortedStrategies = useMemo(
    () => [...strategies].sort((a, b) => b.updatedAt - a.updatedAt),
    [strategies]
  );
  const bankrDrafts = useMemo(
    () => sortedStrategies.filter((strategy) => strategy.type === "bankrOps"),
    [sortedStrategies]
  );
  const lastAudit = useMemo(
    () =>
      [...messages]
        .filter((message) => message.role === "assistant" || message.role === "skill")
        .sort((a, b) => b.createdAt - a.createdAt)[0] || null,
    [messages]
  );

  function toggle(section: SectionKey) {
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function formatUsd(value: number): string {
    return usdFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function formatTime(timestamp: number | null): string {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatSnapshot(value: unknown): string {
    const seen = new WeakSet<object>();
    return (
      JSON.stringify(
        value,
        (_key, current) => {
          if (typeof current === "string" && current.length > 180) {
            return `${current.slice(0, 180)}...`;
          }
          if (current && typeof current === "object") {
            if (seen.has(current)) return "[circular]";
            seen.add(current);
          }
          return current;
        },
        2
      ) ?? "null"
    );
  }

  async function draftTemplateProposal() {
    setTemplateBusy(true);
    setTemplateNotice("");
    try {
      await onCreateDraftProposal(selectedTemplate, templateInput);
      setTemplateNotice("Draft proposal created.");
    } catch {
      setTemplateNotice("Couldn't create draft proposal.");
    } finally {
      setTemplateBusy(false);
    }
  }

  async function createBankrDraft() {
    const text = bankrDraftText.trim();
    if (!text) return;
    setBankrDraftBusy(true);
    setBankrDraftNotice("");
    try {
      await onCreateBankrDraft(text);
      setBankrDraftText("");
      setBankrDraftNotice("Bankr draft created.");
    } catch {
      setBankrDraftNotice("Couldn't create Bankr draft.");
    } finally {
      setBankrDraftBusy(false);
    }
  }

  function toggleRunbook(strategy: Strategy) {
    setOpenRunbooks((prev) => ({ ...prev, [strategy.id]: !prev[strategy.id] }));
    setRunbookDrafts((prev) => ({
      ...prev,
      [strategy.id]:
        prev[strategy.id] ??
        strategy.runbookMarkdown ??
        "## Draft runbook\nOperator review required.\n- Define objective\n- Define constraints\n- Define rollback",
    }));
  }

  async function saveRunbook(strategyId: string) {
    const markdown = runbookDrafts[strategyId] || "";
    setRunbookError(null);
    setRunbookNotice(null);
    try {
      await onUpdateRunbook(strategyId, markdown);
      setRunbookNotice(`Runbook saved: ${strategyId}`);
    } catch {
      setRunbookError("Couldn't save runbook.");
    }
  }

  async function refreshWallet() {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const result = await fetchBankrWalletSnapshot();
      if (!result.ok) {
        setWalletSnapshot(null);
        setWalletError(result.error || "wallet_unavailable");
        return;
      }
      setWalletSnapshot(result.data ?? null);
      setWalletUpdatedAt(Date.now());
    } finally {
      setWalletBusy(false);
    }
  }

  async function refreshTokenInfo() {
    setTokenBusy(true);
    setTokenError(null);
    try {
      const result = await fetchBankrTokenInfoSnapshot({
        chain: tokenQuery.chain || "base",
        token: tokenQuery.token || "USDC",
      });
      if (!result.ok) {
        setTokenSnapshot(null);
        setTokenError(result.error || "token_info_unavailable");
        return;
      }
      setTokenSnapshot(result.data ?? null);
      setTokenUpdatedAt(Date.now());
    } finally {
      setTokenBusy(false);
    }
  }

  const pnlConfigured =
    pnl.last24h.count > 0 ||
    pnl.last7d.count > 0 ||
    pnl.last24h.usdIn !== 0 ||
    pnl.last24h.usdOut !== 0 ||
    pnl.last7d.usdIn !== 0 ||
    pnl.last7d.usdOut !== 0;

  return (
    <div className={[styles["nn-columnBody"], styles.panelBody].join(" ")}>
      <div className={styles["nn-opsBoard"]}>
        <Section
          id="ops-status"
          title="1) Policy Mode + Guardrails"
          help="Policy mode controls what this seat can do."
          open={open.policy}
          onToggle={() => toggle("policy")}
        >
          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>Policy mode</div>
              <span className={styles["nn-statusBadge"]}>{policyMode}</span>
            </div>
            <div className={styles["nn-chipRow"]}>
              <span className={styles["nn-chip"]}>pending: {pendingApprovals.length}</span>
              <span className={styles["nn-chip"]}>ready: {readyToExecute.length}</span>
              <span className={styles["nn-chip"]}>running: {running.length}</span>
            </div>
            {lastAudit ? (
              <button
                type="button"
                className={styles["nn-jumpItem"]}
                onClick={() => onFocusMessage(lastAudit.id)}
              >
                Latest audit: {lastAudit.content.slice(0, 120)}
              </button>
            ) : (
              <div className={styles["nn-muted"]}>No audit messages yet.</div>
            )}
          </div>
        </Section>

        <Section
          title="2) Pending Approvals"
          help="Draft proposals need explicit operator approval."
          open={open.pending}
          onToggle={() => toggle("pending")}
        >
          {pendingApprovals.length ? (
            pendingApprovals.map((proposal) => (
              <button
                key={proposal.id}
                type="button"
                className={[styles["nn-listItem"], styles["nn-listItemButton"]].join(" ")}
                onClick={() => onFocusProposal(proposal.id)}
              >
                <div className={styles["nn-listHead"]}>
                  <div>
                    <div>{proposal.skillId}</div>
                    <div className={styles["nn-muted"]}>{proposal.route}</div>
                  </div>
                  <span className={styles["nn-chip"]}>risk: {proposal.riskLevel}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  {proposal.reasoning.slice(0, 120)}
                  {proposal.reasoning.length > 120 ? "..." : ""}
                </div>
              </button>
            ))
          ) : (
            <div className={styles["nn-emptyHint"]}>
              No draft proposals yet. Ask the assistant for a structured proposal.
            </div>
          )}
        </Section>

        <Section
          title="3) Ready to Execute"
          help="Approved + locked proposals can move to execution."
          open={open.ready}
          onToggle={() => toggle("ready")}
        >
          {readyToExecute.length ? (
            readyToExecute.map((proposal) => (
              <button
                key={proposal.id}
                type="button"
                className={[styles["nn-listItem"], styles["nn-listItemButton"]].join(" ")}
                onClick={() => onFocusProposal(proposal.id)}
              >
                <div className={styles["nn-listHead"]}>
                  <div>
                    <div>{proposal.skillId}</div>
                    <div className={styles["nn-muted"]}>{proposal.route}</div>
                  </div>
                  <span className={styles["nn-statusBadge"]}>
                    {proposal.executionPlan ? "plan ready" : "plan missing"}
                  </span>
                </div>
                <div className={styles["nn-chipRow"]}>
                  <span className={styles["nn-chip"]}>status: {proposal.status}</span>
                  <span className={styles["nn-chip"]}>intent: {proposal.executionIntent}</span>
                  <span className={styles["nn-chip"]}>
                    execute: {proposal.executionPlan ? "enabled" : "blocked"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className={styles["nn-emptyHint"]}>No proposals are ready to execute.</div>
          )}
        </Section>

        <Section
          title="4) Executing / Recent Results"
          help="Running and completed executions appear here."
          open={open.results}
          onToggle={() => toggle("results")}
        >
          {running.length ? (
            <div className={styles["nn-listBlock"]}>
              <div className={styles["nn-muted"]}>Executing</div>
              {running.map((proposal) => (
                <button
                  key={proposal.id}
                  type="button"
                  className={[styles["nn-listItem"], styles["nn-listItemButton"]].join(" ")}
                  onClick={() => onFocusProposal(proposal.id)}
                >
                  <div>{proposal.skillId}</div>
                  <div className={styles["nn-muted"]}>{proposal.route}</div>
                </button>
              ))}
            </div>
          ) : null}

          {recentResults.length ? (
            <div className={styles["nn-listBlock"]}>
              <div className={styles["nn-muted"]}>Recent results</div>
              {recentResults.map((proposal) => (
                <button
                  key={proposal.id}
                  type="button"
                  className={[styles["nn-listItem"], styles["nn-listItemButton"]].join(" ")}
                  onClick={() => onFocusProposal(proposal.id)}
                >
                  <div className={styles["nn-listHead"]}>
                    <div>{proposal.skillId}</div>
                    <span
                      className={[
                        styles["nn-statusBadge"],
                        proposal.executionResult?.ok ? styles["nn-success"] : styles["nn-failure"],
                      ].join(" ")}
                    >
                      {proposal.executionResult?.ok ? "success" : "failed"}
                    </span>
                  </div>
                  <div className={styles["nn-muted"]}>
                    {proposal.executionResult?.route || proposal.route}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles["nn-emptyHint"]}>No recent execution results.</div>
          )}
        </Section>

        <Section
          title="5) Strategies"
          help="Strategy memory with pin, runbook, and propose controls."
          open={open.strategies}
          onToggle={() => toggle("strategies")}
        >
          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>Bankr Draft Composer</div>
              <Tooltip text="Create a bankr strategy draft from text.">
                <span>
                  <Button
                    size="sm"
                    onClick={createBankrDraft}
                    disabled={!bankrDraftText.trim() || bankrDraftBusy}
                  >
                    {bankrDraftBusy ? "Creating..." : "Create Draft"}
                  </Button>
                </span>
              </Tooltip>
            </div>
            <Textarea
              rows={2}
              value={bankrDraftText}
              onChange={(event) => setBankrDraftText(event.target.value)}
              placeholder="Draft a Bankr intent from natural language."
            />
            {bankrDraftNotice ? <div className={styles["nn-muted"]}>{bankrDraftNotice}</div> : null}
          </div>

          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>Bankr Template Proposal</div>
              <Tooltip text="Create a proposal draft from a template.">
                <span>
                  <Button size="sm" onClick={draftTemplateProposal} disabled={templateBusy}>
                    {templateBusy ? "Drafting..." : "Draft Proposal"}
                  </Button>
                </span>
              </Tooltip>
            </div>
            <label className={styles["nn-muted"]}>
              Template
              <select
                className={styles["nn-templateSelect"]}
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value as BankrTemplateId)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles["nn-templateFields"]}>
              {(BANKR_TEMPLATE_FIELDS[selectedTemplate] || []).map((field) => (
                <label key={field.key} className={styles["nn-muted"]}>
                  {field.label}
                  <Input
                    value={templateInput[field.key] || ""}
                    onChange={(event) =>
                      setTemplateInput((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
            </div>
            {templateNotice ? <div className={styles["nn-muted"]}>{templateNotice}</div> : null}
          </div>

          <div className={styles["nn-listItem"]}>
            <div className={styles["nn-listHead"]}>
              <div>Bankr Read-only Snapshots</div>
              <div className={styles["nn-chipRow"]}>
                <Tooltip text="Refresh wallet read-only snapshot.">
                  <span>
                    <Button size="sm" variant="subtle" onClick={refreshWallet} disabled={walletBusy}>
                      {walletBusy ? "Refreshing..." : "Refresh Wallet"}
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip text="Refresh token info read-only snapshot.">
                  <span>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={refreshTokenInfo}
                      disabled={tokenBusy}
                    >
                      {tokenBusy ? "Refreshing..." : "Refresh Token Info"}
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
            <div className={styles["nn-bankrParams"]}>
              <label className={styles["nn-muted"]}>
                chain
                <Input
                  className={styles["nn-bankrInput"]}
                  value={tokenQuery.chain || ""}
                  onChange={(event) =>
                    setTokenQuery((prev) => ({ ...prev, chain: event.target.value }))
                  }
                />
              </label>
              <label className={styles["nn-muted"]}>
                token
                <Input
                  className={styles["nn-bankrInput"]}
                  value={tokenQuery.token || ""}
                  onChange={(event) =>
                    setTokenQuery((prev) => ({ ...prev, token: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className={styles["nn-muted"]}>Wallet updated: {formatTime(walletUpdatedAt)}</div>
            {walletError ? (
              <div className={styles["nn-muted"]}>Couldn't load (policy or missing config).</div>
            ) : walletSnapshot ? (
              <pre className={styles["nn-jsonBlock"]}>{formatSnapshot(walletSnapshot)}</pre>
            ) : (
              <div className={styles["nn-muted"]}>No snapshot yet - click refresh.</div>
            )}
            <div className={styles["nn-muted"]}>Token updated: {formatTime(tokenUpdatedAt)}</div>
            {tokenError ? (
              <div className={styles["nn-muted"]}>Couldn't load (policy or missing config).</div>
            ) : tokenSnapshot ? (
              <pre className={styles["nn-jsonBlock"]}>{formatSnapshot(tokenSnapshot)}</pre>
            ) : (
              <div className={styles["nn-muted"]}>No snapshot yet - click refresh.</div>
            )}
          </div>

          {sortedStrategies.length ? (
            sortedStrategies.map((strategy) => {
              const isBankrDraft = strategy.type === "bankrOps";
              const canPropose = Boolean(strategy.bankr?.action && isBankrStrategyAction(strategy.bankr.action));
              const busyPropose = loadingAction === `bankr-draft:propose:${strategy.id}`;
              const busyPin = loadingAction === `strategy:${strategy.pinned ? "unpin" : "pin"}:${strategy.id}`;
              const busyRunbook = loadingAction === `strategy:runbook:${strategy.id}`;
              const openRunbook = Boolean(openRunbooks[strategy.id]);
              const runbook = runbookDrafts[strategy.id] ?? strategy.runbookMarkdown ?? "";

              return (
                <div key={strategy.id} className={styles["nn-listItem"]}>
                  <div className={styles["nn-listHead"]}>
                    <button
                      type="button"
                      className={styles["nn-jumpItem"]}
                      onClick={() => {
                        if (strategy.linkedProposalId) onFocusProposal(strategy.linkedProposalId);
                        else if (strategy.linkedMessageId) onFocusMessage(strategy.linkedMessageId);
                      }}
                    >
                      <div>{strategy.title}</div>
                      <div className={styles["nn-muted"]}>
                        {strategy.kind} · {strategy.status}
                      </div>
                    </button>
                    <div className={styles["nn-chipRow"]}>
                      <Button
                        size="sm"
                        variant="subtle"
                        disabled={busyPin}
                        onClick={async () => {
                          if (strategy.pinned) await onUnpinStrategy(strategy.id);
                          else await onPinStrategy(strategy.id);
                        }}
                      >
                        {busyPin
                          ? strategy.pinned
                            ? "Unpinning..."
                            : "Pinning..."
                          : strategy.pinned
                          ? "Unpin"
                          : "Pin"}
                      </Button>
                      <Button size="sm" variant="subtle" onClick={() => toggleRunbook(strategy)}>
                        {openRunbook ? "Hide Runbook" : "Open Runbook"}
                      </Button>
                      {isBankrDraft ? (
                        <Button
                          size="sm"
                          disabled={!canPropose || busyPropose}
                          onClick={async () => {
                            setDraftProposeError(null);
                            try {
                              if (canPropose) await onProposeBankrDraft(strategy.id);
                            } catch {
                              setDraftProposeError("Couldn't convert draft to proposal.");
                            }
                          }}
                        >
                          {busyPropose ? "Proposing..." : "Propose"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {strategy.notes ? <div className={styles["nn-muted"]}>{strategy.notes}</div> : null}
                  {openRunbook ? (
                    <div className={styles["nn-previewBlock"]}>
                      {renderRunbookMarkdown(runbook)}
                      <Textarea
                        className={styles["nn-input"]}
                        rows={5}
                        value={runbook}
                        onChange={(event) =>
                          setRunbookDrafts((prev) => ({
                            ...prev,
                            [strategy.id]: event.target.value,
                          }))
                        }
                      />
                      <div className={styles["nn-actions"]}>
                        <Button size="sm" onClick={() => saveRunbook(strategy.id)} disabled={busyRunbook}>
                          {busyRunbook ? "Saving..." : "Save Runbook"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className={styles["nn-emptyHint"]}>No strategies yet.</div>
          )}
          {draftProposeError ? <div className={styles["nn-muted"]}>{draftProposeError}</div> : null}
          {runbookNotice ? <div className={styles["nn-muted"]}>{runbookNotice}</div> : null}
          {runbookError ? <div className={styles["nn-muted"]}>{runbookError}</div> : null}
        </Section>

        <Section
          title="6) PnL Summary"
          help="Declared USD flows from executions only."
          open={open.pnl}
          onToggle={() => toggle("pnl")}
        >
          <Tooltip text="Declared USD flows recorded at execution time; not mark-to-market.">
            <span className={styles["nn-muted"]}>Declared USD</span>
          </Tooltip>
          {pnlConfigured ? (
            <>
              <div className={styles["nn-listItem"]}>
                <div>Last 24h</div>
                <div className={styles["nn-muted"]}>
                  in: <span className={styles["nn-mono"]}>{formatUsd(pnl.last24h.usdIn)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  out: <span className={styles["nn-mono"]}>{formatUsd(pnl.last24h.usdOut)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  net: <span className={styles["nn-mono"]}>{formatUsd(pnl.last24h.net)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  events: <span className={styles["nn-mono"]}>{pnl.last24h.count}</span>
                </div>
              </div>
              <div className={styles["nn-listItem"]}>
                <div>Last 7d</div>
                <div className={styles["nn-muted"]}>
                  in: <span className={styles["nn-mono"]}>{formatUsd(pnl.last7d.usdIn)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  out: <span className={styles["nn-mono"]}>{formatUsd(pnl.last7d.usdOut)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  net: <span className={styles["nn-mono"]}>{formatUsd(pnl.last7d.net)}</span>
                </div>
                <div className={styles["nn-muted"]}>
                  events: <span className={styles["nn-mono"]}>{pnl.last7d.count}</span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles["nn-emptyHint"]}>PnL not configured.</div>
          )}
        </Section>
      </div>
    </div>
  );
}
