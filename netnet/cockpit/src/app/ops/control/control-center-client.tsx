"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import {
  authorizeVealthPayoutAction,
  buildSocialAutopublishPacketsAction,
  buildVealthHandoffBundleAction,
  createSocialAutopublishWorkOrderAction,
  createVealthWorkOrderAction,
  dispatchVealthWorkOrderAction,
  getVealthWorkOrderContextAction,
  getVealthWorkOrderStatusAction,
  heartbeatVealthWorkOrderAction,
  listVealthQueueAction,
  runVealthQueueTickAction,
  runVealthQueueBatchAction,
  runSocialAutopublishReadinessAction,
  getOpsAccessContextAction,
  readAIEyesArtifactsAction,
  planOpsSequenceFromGoalAction,
  runMCPConnectorCheckAction,
  runBankrReadinessCheckAction,
  runOpenClawBootstrapAction,
  runOpenClawConnectionCheckAction,
  runOpenClawPolicyCheckAction,
  runOpenClawSchedulerCheckAction,
  runVealthStaleGuardAction,
  runOpsCommandAction,
  runOpsSequenceAction,
  stopVealthWorkOrderAction,
  verifyVealthWorkOrderAction,
  type AIEyesArtifacts,
  type OpenClawBootstrapResult,
  type OpenClawConnectionResult,
  type OpenClawPolicyResult,
  type OpenClawSchedulerResult,
  type MCPConnectorCheckResult,
  type BankrReadinessResult,
  type OpsAccessContext,
  type OpsPlanResult,
  type OpsRunResult,
  type OpsSequenceResult,
  type VealthDispatchStatus,
  type VealthPayoutAuthorizationResult,
  type VealthQueueBatchResult,
  type VealthQueueListItem,
  type VealthQueueSnapshotResult,
  type VealthQueueTickResult,
  type VealthStaleGuardResult,
  type VealthWorkOrderContextResult,
  type VealthVerificationResult,
  type VealthHandoffBundleResult,
  type SocialAutopublishPacketsResult,
  type SocialAutopublishReadinessResult,
  type OpsWorkOrderResult,
} from "./actions";
import { OPS_COMMANDS, OPS_ROLES, type OpsRole } from "./commands";

type Category = "health" | "build" | "visual" | "git";

const CATEGORY_LABEL: Record<Category, string> = {
  health: "Health",
  build: "Build",
  visual: "Visual",
  git: "Git",
};

const panelStyle: CSSProperties = {
  border: "1px solid var(--nn-border-subtle, #1f2b45)",
  borderRadius: 12,
  padding: 12,
  background: "var(--nn-surface-1, rgba(5, 13, 29, 0.55))",
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function checkStatus(ok: boolean | undefined): string {
  if (ok === undefined) return "NOT RUN";
  return ok ? "PASS" : "FAIL";
}

function ResultPanel({ result }: { result: OpsRunResult | null }) {
  if (!result) {
    return (
      <div style={panelStyle}>
        <strong>Latest command</strong>
        <div style={{ marginTop: 6, opacity: 0.8 }}>No command run yet.</div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>Latest command: {result.commandId}</strong>
        <span>{result.ok ? "PASS" : "FAIL"}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
        {formatTime(result.startedAt)} - {formatTime(result.endedAt)}
      </div>
      {result.error ? (
        <div style={{ marginTop: 8, color: "#f5b6b6" }}>Error: {result.error}</div>
      ) : null}
      {result.steps.map((step) => (
        <details key={`${result.commandId}:${step.command}`} style={{ marginTop: 8 }}>
          <summary>
            [{step.ok ? "ok" : "fail"}] {step.command}
          </summary>
          <pre
            style={{
              marginTop: 8,
              maxHeight: 140,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              fontSize: 12,
            }}
          >
            {step.stdout || step.stderr || "(no output)"}
          </pre>
        </details>
      ))}
    </div>
  );
}

function SequencePanel({ sequence }: { sequence: OpsSequenceResult | null }) {
  if (!sequence) {
    return (
      <div style={panelStyle}>
        <strong>Latest sequence</strong>
        <div style={{ marginTop: 6, opacity: 0.8 }}>No sequence run yet.</div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>Latest sequence</strong>
        <span>{sequence.ok ? "PASS" : "FAIL"}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
        {sequence.commandIds.join(" -> ")}
      </div>
      {sequence.error ? (
        <div style={{ marginTop: 8, color: "#f5b6b6" }}>Error: {sequence.error}</div>
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12 }}>
        {sequence.runs.length} command{sequence.runs.length === 1 ? "" : "s"} processed
      </div>
    </div>
  );
}

function AIEyesPanel({ artifacts }: { artifacts: AIEyesArtifacts | null }) {
  if (!artifacts) {
    return (
      <div style={panelStyle}>
        <strong>AI Eyes artifacts</strong>
        <div style={{ marginTop: 6, opacity: 0.8 }}>Press refresh to load report files.</div>
      </div>
    );
  }

  if (!artifacts.ok) {
    return (
      <div style={panelStyle}>
        <strong>AI Eyes artifacts</strong>
        <div style={{ marginTop: 6, color: "#f5b6b6" }}>
          Report not found. Run "AI Eyes Smoke" first.
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>AI Eyes artifacts</strong>
        <span>{artifacts.updatedAt ? formatDate(artifacts.updatedAt) : "No timestamp"}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 12 }}>
        {artifacts.screenshots.length} screenshot
        {artifacts.screenshots.length === 1 ? "" : "s"}
      </div>
      {artifacts.reportMarkdown ? (
        <details style={{ marginTop: 8 }}>
          <summary>Report markdown</summary>
          <pre
            style={{
              marginTop: 8,
              maxHeight: 220,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              fontSize: 12,
            }}
          >
            {artifacts.reportMarkdown}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function OpenClawSetupPanel({
  requestedRole,
  effectiveRole,
  pending,
  connection,
  scheduler,
  policy,
  mcp,
  bootstrap,
  onConnection,
  onScheduler,
  onPolicy,
  onMcp,
  onBootstrap,
}: {
  requestedRole: OpsRole;
  effectiveRole: OpsRole | null;
  pending: boolean;
  connection: OpenClawConnectionResult | null;
  scheduler: OpenClawSchedulerResult | null;
  policy: OpenClawPolicyResult | null;
  mcp: MCPConnectorCheckResult | null;
  bootstrap: OpenClawBootstrapResult | null;
  onConnection: () => void;
  onScheduler: () => void;
  onPolicy: () => void;
  onMcp: () => void;
  onBootstrap: () => void;
}) {
  const hasFail =
    connection?.ok === false ||
    scheduler?.ok === false ||
    policy?.ok === false ||
    mcp?.ok === false;
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15 }}>OpenClaw setup</h2>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82 }}>
            Verify env, connector reachability, scheduler smoke, and policy guardrails.
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Requested: {requestedRole}
          {" • "}
          Effective: {effectiveRole || "loading"}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <article style={{ border: "1px solid var(--nn-border-subtle, #1f2b45)", borderRadius: 10, padding: 10 }}>
          <strong>1) Verify env + connection</strong>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {checkStatus(connection?.ok)}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onConnection}
            style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8 }}
          >
            Run connection test
          </button>
          {connection ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              {connection.dashboard.configured
                ? connection.dashboard.reachable
                  ? "Dashboard reachable."
                  : `Dashboard check failed: ${connection.dashboard.error || "unknown"}`
                : "OPENCLAW_DASHBOARD_URL is not configured."}
            </div>
          ) : null}
        </article>

        <article style={{ border: "1px solid var(--nn-border-subtle, #1f2b45)", borderRadius: 10, padding: 10 }}>
          <strong>2) Scheduler smoke</strong>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {checkStatus(scheduler?.ok)}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onScheduler}
            style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8 }}
          >
            Run scheduler test
          </button>
          {scheduler ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              Command: {scheduler.run.commandId}
            </div>
          ) : null}
        </article>

        <article style={{ border: "1px solid var(--nn-border-subtle, #1f2b45)", borderRadius: 10, padding: 10 }}>
          <strong>3) Policy/permission guard</strong>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {checkStatus(policy?.ok)}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onPolicy}
            style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8 }}
          >
            Run policy check
          </button>
          {policy ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              Command: {policy.run.commandId}
            </div>
          ) : null}
        </article>

        <article style={{ border: "1px solid var(--nn-border-subtle, #1f2b45)", borderRadius: 10, padding: 10 }}>
          <strong>4) MCP connector readiness</strong>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
            {checkStatus(mcp?.ok)}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onMcp}
            style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8 }}
          >
            Run MCP checks
          </button>
          {mcp ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              {mcp.connectors.filter((connector) => connector.ok).length}/{mcp.connectors.length} connectors healthy
            </div>
          ) : null}
        </article>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={pending}
          onClick={onBootstrap}
          style={{ padding: "6px 10px", borderRadius: 8 }}
        >
          Run full bootstrap
        </button>
        <span style={{ fontSize: 12, opacity: 0.85 }}>
          Full status: {checkStatus(bootstrap?.ok)}
          {bootstrap?.checkedAt ? ` • ${formatDate(bootstrap.checkedAt)}` : ""}
        </span>
        {hasFail ? (
          <span style={{ fontSize: 12, color: "#f5b6b6" }}>
            Fix failed step(s) before enabling autonomous schedules.
          </span>
        ) : null}
      </div>

      {connection ? (
        <details style={{ marginTop: 10 }}>
          <summary>Env checklist</summary>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {connection.env.map((row) => (
              <div key={row.key} style={{ fontSize: 12, opacity: 0.9 }}>
                [{row.present ? "ok" : "missing"}] {row.key}
                {row.required ? " (required)" : ""}
                {row.hint ? ` — ${row.hint}` : ""}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {mcp ? (
        <details style={{ marginTop: 10 }}>
          <summary>MCP connector status</summary>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {mcp.connectors.map((connector) => (
              <div key={connector.id} style={{ fontSize: 12, opacity: 0.9 }}>
                [{connector.ok ? "ok" : "fail"}] {connector.id} ({connector.endpointKey})
                {connector.configured ? "" : " stub"}
                {typeof connector.latestBlock === "number"
                  ? ` latestBlock=${connector.latestBlock}`
                  : ""}
                {connector.error ? ` — ${connector.error}` : ""}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function BankrReadinessPanel({
  pending,
  readiness,
  onRun,
}: {
  pending: boolean;
  readiness: BankrReadinessResult | null;
  onRun: () => void;
}) {
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15 }}>Bankr readiness</h2>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.82 }}>
            Validate Bankr routes, policy gates, and write-lane credentials.
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={onRun}
          style={{ padding: "6px 10px", borderRadius: 8 }}
        >
          Run Bankr readiness
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.88 }}>
        Status: {checkStatus(readiness?.ok)}
        {readiness?.checkedAt ? ` • ${formatDate(readiness.checkedAt)}` : ""}
      </div>

      {readiness ? (
        <>
          <details style={{ marginTop: 10 }}>
            <summary>Env</summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {readiness.env.map((row) => (
                <div key={row.key} style={{ fontSize: 12, opacity: 0.9 }}>
                  [{row.present ? "ok" : "missing"}] {row.key}
                  {row.required ? ` (required-${row.lane})` : ` (optional-${row.lane})`}
                  {row.hint ? ` — ${row.hint}` : ""}
                </div>
              ))}
            </div>
          </details>

          <details style={{ marginTop: 10 }}>
            <summary>Routes</summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {readiness.routes.map((row) => (
                <div key={row.route} style={{ fontSize: 12, opacity: 0.9 }}>
                  [{row.exists ? "ok" : "missing"}] {row.route}
                </div>
              ))}
            </div>
          </details>

          <details style={{ marginTop: 10 }}>
            <summary>Policy</summary>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {readiness.policy.map((row) => (
                <div key={row.action} style={{ fontSize: 12, opacity: 0.9 }}>
                  [{row.ok ? "ok" : "deny"}] {row.action}
                  {row.reasons.length ? ` — ${row.reasons.join("; ")}` : ""}
                </div>
              ))}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}

export default function ControlCenterClient() {
  const [role, setRole] = useState<OpsRole>("operator");
  const [accessContext, setAccessContext] = useState<OpsAccessContext | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<OpsRunResult | null>(null);
  const [lastSequence, setLastSequence] = useState<OpsSequenceResult | null>(null);
  const [plannedSequence, setPlannedSequence] = useState<OpsPlanResult | null>(null);
  const [lastWorkOrder, setLastWorkOrder] = useState<OpsWorkOrderResult | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<VealthDispatchStatus | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VealthVerificationResult | null>(null);
  const [payoutStatus, setPayoutStatus] =
    useState<VealthPayoutAuthorizationResult | null>(null);
  const [queueTickStatus, setQueueTickStatus] =
    useState<VealthQueueTickResult | null>(null);
  const [queueSnapshot, setQueueSnapshot] =
    useState<VealthQueueSnapshotResult | null>(null);
  const [queueBatchStatus, setQueueBatchStatus] =
    useState<VealthQueueBatchResult | null>(null);
  const [staleGuardStatus, setStaleGuardStatus] =
    useState<VealthStaleGuardResult | null>(null);
  const [staleAfterHours, setStaleAfterHours] = useState("6");
  const [socialReadiness, setSocialReadiness] =
    useState<SocialAutopublishReadinessResult | null>(null);
  const [socialPackets, setSocialPackets] =
    useState<SocialAutopublishPacketsResult | null>(null);
  const [handoffBundle, setHandoffBundle] =
    useState<VealthHandoffBundleResult | null>(null);
  const [activeWorkId, setActiveWorkId] = useState("");
  const [goalDraft, setGoalDraft] = useState("");
  const [workOrderOwner, setWorkOrderOwner] = useState("vealth");
  const [workOrderBudget, setWorkOrderBudget] = useState("0");
  const [payoutAmount, setPayoutAmount] = useState("0");
  const [socialTopic, setSocialTopic] = useState("Weekly operator recap");
  const [socialSchedule, setSocialSchedule] = useState("today 9am local");
  const [socialCallToAction, setSocialCallToAction] = useState("Reply for details");
  const [socialTone, setSocialTone] = useState("clear and concise");
  const [pledgeEnabled, setPledgeEnabled] = useState(false);
  const [pledgePartnerToken, setPledgePartnerToken] = useState("");
  const [pledgeCapWei, setPledgeCapWei] = useState("0");
  const [heartbeatNote, setHeartbeatNote] = useState("");
  const [stopReason, setStopReason] = useState("");
  const [workOrderPriority, setWorkOrderPriority] =
    useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [artifacts, setArtifacts] = useState<AIEyesArtifacts | null>(null);
  const [openClawConnection, setOpenClawConnection] =
    useState<OpenClawConnectionResult | null>(null);
  const [openClawScheduler, setOpenClawScheduler] =
    useState<OpenClawSchedulerResult | null>(null);
  const [openClawPolicy, setOpenClawPolicy] =
    useState<OpenClawPolicyResult | null>(null);
  const [openClawMcp, setOpenClawMcp] =
    useState<MCPConnectorCheckResult | null>(null);
  const [bankrReadiness, setBankrReadiness] =
    useState<BankrReadinessResult | null>(null);
  const [openClawBootstrap, setOpenClawBootstrap] =
    useState<OpenClawBootstrapResult | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveRole = accessContext?.effectiveRole || null;
  const runtimeRole = effectiveRole || role;

  function selectedWorkId(): string | null {
    return activeWorkId || lastWorkOrder?.workId || null;
  }

  const grouped = useMemo(() => {
    const bucket: Record<Category, typeof OPS_COMMANDS> = {
      health: [],
      build: [],
      visual: [],
      git: [],
    };
    for (const command of OPS_COMMANDS) {
      bucket[command.category].push(command);
    }
    return bucket;
  }, []);

  const selectedCount = selectedIds.length;
  const selectedId = selectedWorkId();

  useEffect(() => {
    let cancelled = false;
    void getOpsAccessContextAction().then((context) => {
      if (!cancelled) setAccessContext(context);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      listVealthQueueAction({ role, limit: 16 }),
      runSocialAutopublishReadinessAction({ role }),
    ]).then(([queue, readiness]) => {
      if (cancelled) return;
      setQueueSnapshot(queue);
      setSocialReadiness(readiness);
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  function toggleSelection(commandId: string) {
    setSelectedIds((current) =>
      current.includes(commandId)
        ? current.filter((id) => id !== commandId)
        : [...current, commandId],
    );
  }

  function runCommand(commandId: string) {
    startTransition(async () => {
      const result = await runOpsCommandAction({ role, commandId });
      setLastResult(result);
    });
  }

  function runSequence() {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const sequence = await runOpsSequenceAction({
        role,
        commandIds: selectedIds,
      });
      setLastSequence(sequence);
    });
  }

  function planFromGoal() {
    startTransition(async () => {
      const plan = await planOpsSequenceFromGoalAction({ role, goal: goalDraft });
      setPlannedSequence(plan);
      setSelectedIds(plan.commandIds);
    });
  }

  function createWorkOrder() {
    startTransition(async () => {
      const result = await createVealthWorkOrderAction({
        role,
        goal: goalDraft,
        owner: workOrderOwner,
        budgetUsd: Number(workOrderBudget || 0),
        priority: workOrderPriority,
        liquidityPledgeEnabled: pledgeEnabled,
        liquidityPledgePartnerToken: pledgePartnerToken,
        liquidityPledgeCapWei: pledgeCapWei,
      });
      setLastWorkOrder(result);
      setDispatchStatus(null);
      setVerificationStatus(null);
      setPayoutStatus(null);
      setQueueTickStatus(null);
      setSocialPackets(null);
      setHandoffBundle(null);
      if (result.workId) setActiveWorkId(result.workId);
      await refreshQueueSnapshot();
    });
  }

  function refreshDispatchStatus() {
    const workId = selectedWorkId();
    if (!workId) return;
    startTransition(async () => {
      const result = await getVealthWorkOrderStatusAction({
        role,
        workId,
      });
      setDispatchStatus(result);
    });
  }

  function dispatchToVealth() {
    const workId = selectedWorkId();
    if (!workId) return;
    startTransition(async () => {
      const result = await dispatchVealthWorkOrderAction({
        role,
        workId,
      });
      setDispatchStatus(result);
      void refreshQueueSnapshot();
    });
  }

  function sendHeartbeat() {
    const workId = selectedWorkId();
    if (!workId) return;
    startTransition(async () => {
      const result = await heartbeatVealthWorkOrderAction({
        role,
        workId,
        note: heartbeatNote,
      });
      setDispatchStatus(result);
      setHeartbeatNote("");
      void refreshQueueSnapshot();
    });
  }

  function stopDispatch() {
    const workId = selectedWorkId();
    if (!workId) return;
    startTransition(async () => {
      const result = await stopVealthWorkOrderAction({
        role,
        workId,
        reason: stopReason,
      });
      setDispatchStatus(result);
      setStopReason("");
      void refreshQueueSnapshot();
    });
  }

  function verifyWorkOrder() {
    const workId = selectedWorkId();
    if (!workId) return;
    startTransition(async () => {
      const result = await verifyVealthWorkOrderAction({
        role,
        workId,
      });
      setVerificationStatus(result);
      void refreshQueueSnapshot();
    });
  }

  function authorizePayout() {
    const workId = selectedWorkId();
    if (!workId) return;
    const parsed = Number(payoutAmount);
    const amountUsd = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    startTransition(async () => {
      const result = await authorizeVealthPayoutAction({
        role,
        workId,
        amountUsd,
        note: "Authorized from Ops Control lane.",
      });
      setPayoutStatus(result);
      if (result.ok) {
        setPayoutAmount("0");
      }
      void refreshQueueSnapshot();
    });
  }

  function runQueueTick(dryRun: boolean) {
    startTransition(async () => {
      const result = await runVealthQueueTickAction({
        role,
        dryRun,
      });
      setQueueTickStatus(result);
      if (result.dispatch) setDispatchStatus(result.dispatch);
      if (result.verification) setVerificationStatus(result.verification);
      if (result.payout) setPayoutStatus(result.payout);
      if (result.workId) setActiveWorkId(result.workId);
      void refreshQueueSnapshot();
    });
  }

  async function refreshQueueSnapshot() {
    const result = await listVealthQueueAction({ role, limit: 16 });
    setQueueSnapshot(result);
  }

  async function refreshSocialReadiness() {
    const result = await runSocialAutopublishReadinessAction({ role });
    setSocialReadiness(result);
  }

  function loadWorkContext(workId: string) {
    startTransition(async () => {
      const context: VealthWorkOrderContextResult = await getVealthWorkOrderContextAction({
        role,
        workId,
      });
      if (!context.ok || !context.workId) return;
      setSocialPackets(null);
      setHandoffBundle(null);
      setActiveWorkId(context.workId);
      setLastWorkOrder({
        ok: true,
        role: context.role,
        checkedAt: context.checkedAt,
        workId: context.workId,
        title: context.title,
        contract: context.contract,
      });
      const status = await getVealthWorkOrderStatusAction({
        role,
        workId: context.workId,
      });
      setDispatchStatus(status);
      if (context.verification) {
        setVerificationStatus({
          ok: context.verification.ok,
          role: context.role,
          checkedAt: context.verification.checkedAt || context.checkedAt,
          workId: context.workId,
          checks: [],
          passedRequired: 0,
          totalRequired: 0,
          payoutEligible: context.verification.payoutEligible === true,
          payoutCapUsd: context.verification.payoutCapUsd || 0,
          error: context.verification.ok ? undefined : "verification_previous_failed",
        });
      } else {
        setVerificationStatus(null);
      }
      if (context.payout && typeof context.payout.authorizedUsd === "number") {
        setPayoutStatus({
          ok: true,
          role: context.role,
          checkedAt: context.checkedAt,
          workId: context.workId,
          payoutEligible: true,
          payoutCapUsd: context.payout.authorizedUsd,
          authorizedUsd: context.payout.authorizedUsd,
        });
      } else {
        setPayoutStatus(null);
      }
    });
  }

  function runQueueBatch(dryRun: boolean) {
    startTransition(async () => {
      const result = await runVealthQueueBatchAction({
        role,
        dryRun,
        limit: 4,
      });
      setQueueBatchStatus(result);
      const lastRun = [...result.runs].reverse().find((run) => run.workId);
      if (lastRun?.workId) {
        setActiveWorkId(lastRun.workId);
      }
      void refreshQueueSnapshot();
    });
  }

  function runStaleGuard(dryRun: boolean) {
    const parsed = Number(staleAfterHours);
    const threshold = Number.isFinite(parsed) && parsed > 0 ? parsed : 6;
    startTransition(async () => {
      const result = await runVealthStaleGuardAction({
        role,
        staleAfterHours: threshold,
        dryRun,
      });
      setStaleGuardStatus(result);
      await refreshQueueSnapshot();
    });
  }

  function buildSocialPacketsFor(workId: string) {
    startTransition(async () => {
      const result = await buildSocialAutopublishPacketsAction({
        role,
        workId,
      });
      setSocialPackets(result);
    });
  }

  function buildSocialPackets() {
    const workId = selectedWorkId();
    if (!workId) return;
    buildSocialPacketsFor(workId);
  }

  function buildHandoffBundleFor(workId: string) {
    startTransition(async () => {
      const result = await buildVealthHandoffBundleAction({
        role,
        workId,
      });
      setHandoffBundle(result);
    });
  }

  function buildHandoffBundle() {
    const workId = selectedWorkId();
    if (!workId) return;
    buildHandoffBundleFor(workId);
  }

  function createSocialWorkOrder() {
    startTransition(async () => {
      const result = await createSocialAutopublishWorkOrderAction({
        role,
        owner: workOrderOwner,
        budgetUsd: Number(workOrderBudget || 0),
        priority: workOrderPriority,
        topic: socialTopic,
        schedule: socialSchedule,
        callToAction: socialCallToAction,
        tone: socialTone,
      });
      setLastWorkOrder(result);
      setDispatchStatus(null);
      setVerificationStatus(null);
      setPayoutStatus(null);
      setQueueTickStatus(null);
      setSocialPackets(null);
      setHandoffBundle(null);
      if (result.workId) setActiveWorkId(result.workId);
      await refreshQueueSnapshot();
      await refreshSocialReadiness();
    });
  }

  function refreshAIEyes() {
    startTransition(async () => {
      const data = await readAIEyesArtifactsAction();
      setArtifacts(data);
    });
  }

  function runOpenClawConnection() {
    startTransition(async () => {
      const result = await runOpenClawConnectionCheckAction({ role });
      setOpenClawConnection(result);
    });
  }

  function runOpenClawScheduler() {
    startTransition(async () => {
      const result = await runOpenClawSchedulerCheckAction({ role });
      setOpenClawScheduler(result);
    });
  }

  function runOpenClawPolicy() {
    startTransition(async () => {
      const result = await runOpenClawPolicyCheckAction({ role });
      setOpenClawPolicy(result);
    });
  }

  function runOpenClawBootstrap() {
    startTransition(async () => {
      const result = await runOpenClawBootstrapAction({ role });
      setOpenClawBootstrap(result);
      setOpenClawConnection(result.steps.connection);
      setOpenClawScheduler(result.steps.scheduler);
      setOpenClawPolicy(result.steps.policy);
      setOpenClawMcp(result.steps.mcp);
    });
  }

  function runOpenClawMcp() {
    startTransition(async () => {
      const result = await runMCPConnectorCheckAction({ role });
      setOpenClawMcp(result);
    });
  }

  function runBankrReadiness() {
    startTransition(async () => {
      const result = await runBankrReadinessCheckAction({ role });
      setBankrReadiness(result);
    });
  }

  return (
    <main style={{ padding: 16, display: "grid", gap: 12 }}>
      <header style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18 }}>Ops Control Center</h1>
            <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.82 }}>
              Server-authoritative command execution with custom sequence runner.
            </p>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Requested role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as OpsRole)}
              style={{ padding: "6px 10px", borderRadius: 8 }}
              aria-label="Operator role"
            >
              {OPS_ROLES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          Effective role: <strong>{runtimeRole}</strong>
          {accessContext?.configuredRole
            ? ` (from ${accessContext.configuredRole})`
            : " (default server policy)"}
        </div>
        {accessContext?.notes?.length ? (
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            {accessContext.notes[0]}
          </div>
        ) : null}
      </header>

      <OpenClawSetupPanel
        requestedRole={role}
        effectiveRole={effectiveRole}
        pending={pending}
        connection={openClawConnection}
        scheduler={openClawScheduler}
        policy={openClawPolicy}
        mcp={openClawMcp}
        bootstrap={openClawBootstrap}
        onConnection={runOpenClawConnection}
        onScheduler={runOpenClawScheduler}
        onPolicy={runOpenClawPolicy}
        onMcp={runOpenClawMcp}
        onBootstrap={runOpenClawBootstrap}
      />

      <BankrReadinessPanel
        pending={pending}
        readiness={bankrReadiness}
        onRun={runBankrReadiness}
      />

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15 }}>Vealth queue snapshot</h2>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              Load existing work orders, run bounded queue ticks, and monitor social lane readiness.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await refreshQueueSnapshot();
                  await refreshSocialReadiness();
                });
              }}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Refresh queue
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runQueueBatch(true)}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Batch dry run
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runQueueBatch(false)}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Batch execute
            </button>
            <input
              value={staleAfterHours}
              onChange={(event) => setStaleAfterHours(event.target.value)}
              aria-label="stale after hours"
              style={{
                borderRadius: 8,
                padding: "6px 10px",
                border: "1px solid var(--nn-border-subtle, #1f2b45)",
                background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                color: "inherit",
                width: 100,
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => runStaleGuard(true)}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Stale guard dry run
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runStaleGuard(false)}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Stale guard execute
            </button>
          </div>
        </div>

        {queueBatchStatus ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>
            Batch: {queueBatchStatus.ok ? "PASS" : "FAIL"} • dryRun=
            {queueBatchStatus.dryRun ? "yes" : "no"} • runs={queueBatchStatus.runs.length}
            {queueBatchStatus.error ? ` • ${queueBatchStatus.error}` : ""}
          </div>
        ) : null}

        {socialReadiness ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>
            Social readiness: {socialReadiness.ok ? "READY" : "MISSING ROUTES"} •{" "}
            {socialReadiness.channels
              .map((row) => `${row.channel}:${row.exists ? "ok" : "missing"}`)
              .join(" | ")}
          </div>
        ) : null}

        {staleGuardStatus ? (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.86 }}>
            Stale guard: scanned={staleGuardStatus.scanned} • stale=
            {staleGuardStatus.staleItems.length} • escalated=
            {staleGuardStatus.escalatedCount}
            {staleGuardStatus.error ? ` • ${staleGuardStatus.error}` : ""}
          </div>
        ) : null}

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {(queueSnapshot?.items || []).length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              No Vealth work orders in queue.
            </div>
          ) : (
            (queueSnapshot?.items || []).map((item: VealthQueueListItem) => (
              <article
                key={item.workId}
                style={{
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{item.title}</strong>
                  <span style={{ fontSize: 12, opacity: 0.85 }}>{item.workId}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.86 }}>
                  priority={item.priority} • status={item.status} • dispatch={item.dispatchState}
                  {" • "}
                  verify={item.verificationOk ? "ok" : "pending"} • payout=
                  {item.payoutAuthorized ? "done" : "pending"}
                  {item.hasSocialAutopublish ? " • social=enabled" : ""}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => loadWorkContext(item.workId)}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Load context
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setActiveWorkId(item.workId);
                      runQueueTick(true);
                    }}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Tick dry run
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setActiveWorkId(item.workId);
                      runQueueTick(false);
                    }}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Tick execute
                  </button>
                  <button
                    type="button"
                    disabled={pending || !item.hasSocialAutopublish}
                    onClick={() => {
                      setActiveWorkId(item.workId);
                      buildSocialPacketsFor(item.workId);
                    }}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Social packets
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setActiveWorkId(item.workId);
                      buildHandoffBundleFor(item.workId);
                    }}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Handoff bundle
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        {(Object.keys(grouped) as Category[]).map((category) => (
          <div key={category} style={panelStyle}>
            <h2 style={{ margin: 0, fontSize: 15 }}>{CATEGORY_LABEL[category]}</h2>
            <div
              style={{
                marginTop: 10,
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              }}
            >
              {grouped[category].map((command) => {
                const allowed = command.roles.includes(runtimeRole);
                const selected = selectedIds.includes(command.id);
                return (
                  <article
                    key={command.id}
                    style={{
                      border: "1px solid var(--nn-border-subtle, #1f2b45)",
                      borderRadius: 10,
                      padding: 10,
                      opacity: allowed ? 1 : 0.62,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{command.title}</strong>
                      <span style={{ fontSize: 12 }}>{command.id}</span>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                      {command.description}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                      Roles: {command.roles.join(", ")}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        disabled={!allowed || pending}
                        onClick={() => runCommand(command.id)}
                        style={{ padding: "6px 10px", borderRadius: 8 }}
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleSelection(command.id)}
                        style={{ padding: "6px 10px", borderRadius: 8 }}
                      >
                        {selected ? "Selected" : "Add to sequence"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <strong>Codex Unit Runner</strong>
          <div style={{ fontSize: 13, opacity: 0.86 }}>
            Enter a unit goal, generate a deterministic command plan, then run the selected sequence.
          </div>
          <textarea
            value={goalDraft}
            onChange={(event) => setGoalDraft(event.target.value)}
            rows={2}
            placeholder="Example: validate MCP readiness and ship build-safe changes"
            style={{
              width: "100%",
              borderRadius: 8,
              padding: "8px 10px",
              border: "1px solid var(--nn-border-subtle, #1f2b45)",
              background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
              color: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={pending}
              onClick={planFromGoal}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Plan from goal
            </button>
            {plannedSequence ? (
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                Planned: {plannedSequence.commandIds.join(" -> ")}
              </span>
            ) : null}
          </div>
          {plannedSequence?.rationale?.length ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {plannedSequence.rationale.join(" ")}
            </div>
          ) : null}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 8 }}>
          <strong>Vealth Work Order</strong>
          <div style={{ fontSize: 13, opacity: 0.86 }}>
            Create a machine-readable work order from the goal for Vealth/OpenClaw dispatch.
          </div>
          {selectedId ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Active work id: {selectedId}
            </div>
          ) : null}
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
              Owner
              <input
                value={workOrderOwner}
                onChange={(event) => setWorkOrderOwner(event.target.value)}
                style={{
                  borderRadius: 8,
                  padding: "6px 10px",
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                  color: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
              Budget USD
              <input
                value={workOrderBudget}
                onChange={(event) => setWorkOrderBudget(event.target.value)}
                style={{
                  borderRadius: 8,
                  padding: "6px 10px",
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                  color: "inherit",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
              Priority
              <select
                value={workOrderPriority}
                onChange={(event) =>
                  setWorkOrderPriority(
                    event.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
                  )
                }
                style={{
                  borderRadius: 8,
                  padding: "6px 10px",
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                  color: "inherit",
                }}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
              Liquidity pledge
              <select
                value={pledgeEnabled ? "on" : "off"}
                onChange={(event) => setPledgeEnabled(event.target.value === "on")}
                style={{
                  borderRadius: 8,
                  padding: "6px 10px",
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                  color: "inherit",
                }}
              >
                <option value="off">off</option>
                <option value="on">on</option>
              </select>
            </label>
            {pledgeEnabled ? (
              <>
                <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                  Partner token (Base)
                  <input
                    value={pledgePartnerToken}
                    onChange={(event) => setPledgePartnerToken(event.target.value)}
                    placeholder="0x..."
                    style={{
                      borderRadius: 8,
                      padding: "6px 10px",
                      border: "1px solid var(--nn-border-subtle, #1f2b45)",
                      background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                      color: "inherit",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                  ECO matched cap (wei)
                  <input
                    value={pledgeCapWei}
                    onChange={(event) => setPledgeCapWei(event.target.value)}
                    placeholder="1000000000000000000"
                    style={{
                      borderRadius: 8,
                      padding: "6px 10px",
                      border: "1px solid var(--nn-border-subtle, #1f2b45)",
                      background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                      color: "inherit",
                    }}
                  />
                </label>
              </>
            ) : null}
          </div>
          <div
            style={{
              border: "1px solid var(--nn-border-subtle, #1f2b45)",
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 13 }}>Social autopublish sequence</strong>
            <div style={{ fontSize: 12, opacity: 0.82 }}>
              Generates proposal-first work order in strict order: YouTube -&gt; X -&gt; Instagram -&gt; Facebook.
            </div>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                Topic
                <input
                  value={socialTopic}
                  onChange={(event) => setSocialTopic(event.target.value)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: "1px solid var(--nn-border-subtle, #1f2b45)",
                    background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                    color: "inherit",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                Schedule
                <input
                  value={socialSchedule}
                  onChange={(event) => setSocialSchedule(event.target.value)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: "1px solid var(--nn-border-subtle, #1f2b45)",
                    background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                    color: "inherit",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                CTA
                <input
                  value={socialCallToAction}
                  onChange={(event) => setSocialCallToAction(event.target.value)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: "1px solid var(--nn-border-subtle, #1f2b45)",
                    background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                    color: "inherit",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                Tone
                <input
                  value={socialTone}
                  onChange={(event) => setSocialTone(event.target.value)}
                  style={{
                    borderRadius: 8,
                    padding: "6px 10px",
                    border: "1px solid var(--nn-border-subtle, #1f2b45)",
                    background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                    color: "inherit",
                  }}
                />
              </label>
            </div>
            <div>
              <button
                type="button"
                disabled={pending}
                onClick={createSocialWorkOrder}
                style={{ padding: "6px 10px", borderRadius: 8 }}
              >
                Create Social Work Order
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={pending || !goalDraft.trim()}
              onClick={createWorkOrder}
              style={{ padding: "6px 10px", borderRadius: 8 }}
            >
              Create Work Order
            </button>
            {selectedId ? (
              <a
                href={`/work?q=${encodeURIComponent(selectedId)}`}
                style={{ fontSize: 12, opacity: 0.9, alignSelf: "center" }}
              >
                Open Work: {selectedId}
              </a>
            ) : null}
          </div>
          {selectedId ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={dispatchToVealth}
                  style={{ padding: "6px 10px", borderRadius: 8 }}
                >
                  Dispatch to Vealth
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={refreshDispatchStatus}
                  style={{ padding: "6px 10px", borderRadius: 8 }}
                >
                  Refresh status
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                  Heartbeat note
                  <input
                    value={heartbeatNote}
                    onChange={(event) => setHeartbeatNote(event.target.value)}
                    placeholder="Agent running in bounded mode."
                    style={{
                      borderRadius: 8,
                      padding: "6px 10px",
                      border: "1px solid var(--nn-border-subtle, #1f2b45)",
                      background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                      color: "inherit",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                  Stop reason
                  <input
                    value={stopReason}
                    onChange={(event) => setStopReason(event.target.value)}
                    placeholder="Budget cap reached."
                    style={{
                      borderRadius: 8,
                      padding: "6px 10px",
                      border: "1px solid var(--nn-border-subtle, #1f2b45)",
                      background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                      color: "inherit",
                    }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={sendHeartbeat}
                  style={{ padding: "6px 10px", borderRadius: 8 }}
                >
                  Heartbeat
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={stopDispatch}
                  style={{ padding: "6px 10px", borderRadius: 8 }}
                >
                  Stop
                </button>
              </div>
              <div
                style={{
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  borderRadius: 10,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>Verification + payout lane</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={verifyWorkOrder}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Verify checks
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runQueueTick(true)}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Queue tick (dry run)
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runQueueTick(false)}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Queue tick (execute)
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <label style={{ display: "grid", gap: 4, fontSize: 12, opacity: 0.9 }}>
                    Payout amount USD (optional)
                    <input
                      value={payoutAmount}
                      onChange={(event) => setPayoutAmount(event.target.value)}
                      placeholder="0"
                      style={{
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: "1px solid var(--nn-border-subtle, #1f2b45)",
                        background: "var(--nn-surface-0, rgba(3, 8, 18, 0.8))",
                        color: "inherit",
                      }}
                    />
                  </label>
                  <div style={{ display: "grid", alignContent: "end" }}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={authorizePayout}
                      style={{ padding: "6px 10px", borderRadius: 8, width: "fit-content" }}
                    >
                      Authorize payout
                    </button>
                  </div>
                </div>
                {verificationStatus ? (
                  <div style={{ fontSize: 12, opacity: 0.88 }}>
                    Verification: {verificationStatus.ok ? "PASS" : "FAIL"} • required{" "}
                    {verificationStatus.passedRequired}/{verificationStatus.totalRequired}
                    {" • "}
                    payoutEligible={verificationStatus.payoutEligible ? "yes" : "no"}
                    {verificationStatus.error ? ` • ${verificationStatus.error}` : ""}
                  </div>
                ) : null}
                {payoutStatus ? (
                  <div style={{ fontSize: 12, opacity: 0.88 }}>
                    Payout: {payoutStatus.ok ? "AUTHORIZED" : "NOT AUTHORIZED"}
                    {typeof payoutStatus.authorizedUsd === "number"
                      ? ` • ${payoutStatus.authorizedUsd} USD`
                      : ""}
                    {payoutStatus.error ? ` • ${payoutStatus.error}` : ""}
                  </div>
                ) : null}
                {queueTickStatus ? (
                  <div style={{ fontSize: 12, opacity: 0.88 }}>
                    Queue tick: {queueTickStatus.nextAction} • {queueTickStatus.details}
                    {queueTickStatus.error ? ` • ${queueTickStatus.error}` : ""}
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  border: "1px solid var(--nn-border-subtle, #1f2b45)",
                  borderRadius: 10,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <strong style={{ fontSize: 13 }}>Agent handoff lane</strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={buildHandoffBundle}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Build handoff bundle
                  </button>
                  <button
                    type="button"
                    disabled={pending || !lastWorkOrder?.contract?.socialAutopublish?.enabled}
                    onClick={buildSocialPackets}
                    style={{ padding: "6px 10px", borderRadius: 8 }}
                  >
                    Build social packets
                  </button>
                </div>
                {socialPackets ? (
                  <div style={{ fontSize: 12, opacity: 0.88 }}>
                    Social packets: {socialPackets.packets.length} • topic={socialPackets.topic || "n/a"}
                    {socialPackets.error ? ` • ${socialPackets.error}` : ""}
                  </div>
                ) : null}
                {handoffBundle ? (
                  <div style={{ fontSize: 12, opacity: 0.88 }}>
                    Handoff bundle: {handoffBundle.ok ? "ready" : "failed"}
                    {handoffBundle.error ? ` • ${handoffBundle.error}` : ""}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {lastWorkOrder?.error ? (
            <div style={{ fontSize: 12, color: "#f5b6b6" }}>Error: {lastWorkOrder.error}</div>
          ) : null}
          {dispatchStatus ? (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Dispatch: {dispatchStatus.state}
              {dispatchStatus.remote
                ? ` • ${dispatchStatus.remote.mode}${dispatchStatus.remote.requested ? "" : " (local queue)"}`
                : ""}
              {dispatchStatus.remote?.statusCode ? ` • HTTP ${dispatchStatus.remote.statusCode}` : ""}
              {dispatchStatus.error ? ` • ${dispatchStatus.error}` : ""}
            </div>
          ) : null}
          {lastWorkOrder?.contract?.socialAutopublish?.enabled ? (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Social sequence: {lastWorkOrder.contract.socialAutopublish.order.join(" -> ")}
              {" • "}
              {lastWorkOrder.contract.socialAutopublish.connectors
                .map((connector) =>
                  `${connector.channel}:${connector.available ? "ready" : "missing"}`
                )
                .join(" | ")}
            </div>
          ) : null}
          {lastWorkOrder?.contract ? (
            <details>
              <summary style={{ fontSize: 12 }}>Work order contract (json)</summary>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(lastWorkOrder.contract, null, 2)}
              </pre>
            </details>
          ) : null}
          {socialPackets ? (
            <details>
              <summary style={{ fontSize: 12 }}>Social packets (json)</summary>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: 200,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(socialPackets, null, 2)}
              </pre>
            </details>
          ) : null}
          {handoffBundle?.bundle ? (
            <details>
              <summary style={{ fontSize: 12 }}>Handoff bundle (json)</summary>
              <pre
                style={{
                  marginTop: 8,
                  maxHeight: 220,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                }}
              >
                {JSON.stringify(handoffBundle.bundle, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <strong>Custom sequence builder</strong>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{selectedCount} selected</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.86 }}>
          Choose commands in order, then run once.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={runSequence}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            Run selected sequence
          </button>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={() => setSelectedIds([])}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            Clear
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={refreshAIEyes}
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            Refresh AI Eyes
          </button>
        </div>
        {selectedCount > 0 ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
            {selectedIds.join(" -> ")}
          </div>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <ResultPanel result={lastResult} />
        <SequencePanel sequence={lastSequence} />
        <AIEyesPanel artifacts={artifacts} />
      </section>
    </main>
  );
}
