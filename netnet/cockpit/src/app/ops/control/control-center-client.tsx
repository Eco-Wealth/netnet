"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import {
  getOpsAccessContextAction,
  readAIEyesArtifactsAction,
  runMCPConnectorCheckAction,
  runOpenClawBootstrapAction,
  runOpenClawConnectionCheckAction,
  runOpenClawPolicyCheckAction,
  runOpenClawSchedulerCheckAction,
  runOpsCommandAction,
  runOpsSequenceAction,
  type AIEyesArtifacts,
  type OpenClawBootstrapResult,
  type OpenClawConnectionResult,
  type OpenClawPolicyResult,
  type OpenClawSchedulerResult,
  type MCPConnectorCheckResult,
  type OpsAccessContext,
  type OpsRunResult,
  type OpsSequenceResult,
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

export default function ControlCenterClient() {
  const [role, setRole] = useState<OpsRole>("operator");
  const [accessContext, setAccessContext] = useState<OpsAccessContext | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<OpsRunResult | null>(null);
  const [lastSequence, setLastSequence] = useState<OpsSequenceResult | null>(null);
  const [artifacts, setArtifacts] = useState<AIEyesArtifacts | null>(null);
  const [openClawConnection, setOpenClawConnection] =
    useState<OpenClawConnectionResult | null>(null);
  const [openClawScheduler, setOpenClawScheduler] =
    useState<OpenClawSchedulerResult | null>(null);
  const [openClawPolicy, setOpenClawPolicy] =
    useState<OpenClawPolicyResult | null>(null);
  const [openClawMcp, setOpenClawMcp] =
    useState<MCPConnectorCheckResult | null>(null);
  const [openClawBootstrap, setOpenClawBootstrap] =
    useState<OpenClawBootstrapResult | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveRole = accessContext?.effectiveRole || null;
  const runtimeRole = effectiveRole || role;

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

  useEffect(() => {
    let cancelled = false;
    void getOpsAccessContextAction().then((context) => {
      if (!cancelled) setAccessContext(context);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
