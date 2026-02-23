"use server";

import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getOpsCommandById, type OpsCommandSpec, type OpsRole } from "./commands";
import { createStubMCPClient } from "@/mcp";
import type { MCPChain, MCPResponse } from "@/mcp/types";

const COCKPIT_ROOT = process.cwd();
const REPO_ROOT = path.resolve(COCKPIT_ROOT, "..", "..");
const AI_EYES_DIR = path.join(COCKPIT_ROOT, "test-results", "ai-eyes");
const OUTPUT_LIMIT = 8000;
const STEP_TIMEOUT_MS = 12 * 60 * 1000;
const DEFAULT_SERVER_ROLE: OpsRole = "viewer";

export type OpsStepResult = {
  command: string;
  cwd: "repo" | "cockpit";
  exitCode: number;
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type OpsRunResult = {
  ok: boolean;
  commandId: string;
  role: OpsRole;
  startedAt: number;
  endedAt: number;
  steps: OpsStepResult[];
  error?: string;
};

export type OpsSequenceResult = {
  ok: boolean;
  role: OpsRole;
  commandIds: string[];
  startedAt: number;
  endedAt: number;
  runs: OpsRunResult[];
  error?: string;
};

export type OpsPlanResult = {
  ok: boolean;
  role: OpsRole;
  goal: string;
  commandIds: string[];
  rationale: string[];
};

export type AIEyesArtifacts = {
  ok: boolean;
  updatedAt?: number;
  reportJson?: string;
  reportMarkdown?: string;
  screenshots: string[];
  error?: string;
};

export type OpenClawEnvCheckItem = {
  key: string;
  required: boolean;
  present: boolean;
  hint?: string;
};

export type OpenClawConnectionResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  dashboard: {
    configured: boolean;
    reachable: boolean;
    statusCode?: number;
    error?: string;
  };
  env: OpenClawEnvCheckItem[];
  routes: Array<{ route: string; exists: boolean }>;
  error?: string;
};

export type OpenClawSchedulerResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  run: OpsRunResult;
};

export type OpenClawPolicyResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  run: OpsRunResult;
};

export type MCPConnectorStatus = {
  id: "regen" | "registry-review" | "regen-koi" | "regen-python";
  endpointKey:
    | "REGEN_MCP_URL"
    | "REGISTRY_REVIEW_MCP_URL"
    | "REGEN_KOI_MCP_URL"
    | "REGEN_PYTHON_MCP_URL";
  configured: boolean;
  ok: boolean;
  latestBlock?: number;
  stub?: boolean;
  error?: string;
};

export type MCPConnectorCheckResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  connectors: MCPConnectorStatus[];
  error?: string;
};

export type OpenClawBootstrapResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  steps: {
    connection: OpenClawConnectionResult;
    scheduler: OpenClawSchedulerResult;
    policy: OpenClawPolicyResult;
    mcp: MCPConnectorCheckResult;
  };
};

type RunInput = {
  commandId: string;
  role?: OpsRole;
};

export type OpsAccessContext = {
  effectiveRole: OpsRole;
  source: "server_env";
  configuredRole: string;
  notes: string[];
};

function normalizeRole(value: string): OpsRole {
  if (value === "admin" || value === "operator" || value === "viewer") {
    return value;
  }
  return DEFAULT_SERVER_ROLE;
}

function resolveServerRole(): OpsRole {
  const configured = String(
    process.env.NETNET_OPS_CONTROL_ROLE || process.env.OPS_CONTROL_SERVER_ROLE || ""
  )
    .trim()
    .toLowerCase();
  return normalizeRole(configured);
}

export async function getOpsAccessContextAction(): Promise<OpsAccessContext> {
  const configuredRole = String(
    process.env.NETNET_OPS_CONTROL_ROLE || process.env.OPS_CONTROL_SERVER_ROLE || ""
  ).trim();
  const effectiveRole = resolveServerRole();
  return {
    effectiveRole,
    source: "server_env",
    configuredRole,
    notes: [
      "Role is resolved on server from NETNET_OPS_CONTROL_ROLE or OPS_CONTROL_SERVER_ROLE.",
      "Client role selector cannot elevate command permissions.",
    ],
  };
}

function trimOutput(value: string): string {
  if (value.length <= OUTPUT_LIMIT) {
    return value;
  }
  return value.slice(value.length - OUTPUT_LIMIT);
}

function hasAccess(role: OpsRole, command: OpsCommandSpec): boolean {
  return command.roles.includes(role);
}

function toCwd(stepCwd: "repo" | "cockpit"): string {
  return stepCwd === "repo" ? REPO_ROOT : COCKPIT_ROOT;
}

function toEnvCheck(): OpenClawEnvCheckItem[] {
  const engineMode = String(process.env.OPERATOR_ENGINE || "openrouter").trim().toLowerCase();
  const requiresOpenRouter = engineMode !== "local";
  const list: OpenClawEnvCheckItem[] = [
    {
      key: "OPENCLAW_DASHBOARD_URL",
      required: true,
      present: Boolean(String(process.env.OPENCLAW_DASHBOARD_URL || "").trim()),
      hint: "OpenClaw dashboard base URL",
    },
    {
      key: "OPENCLAW_API_KEY",
      required: true,
      present: Boolean(String(process.env.OPENCLAW_API_KEY || "").trim()),
      hint: "Agent API key for dashboard calls",
    },
    {
      key: "OPENCLAW_AGENT_ID",
      required: false,
      present: Boolean(String(process.env.OPENCLAW_AGENT_ID || "").trim()),
      hint: "Optional but useful for scoped runs",
    },
    {
      key: "OPENROUTER_API_KEY",
      required: requiresOpenRouter,
      present: Boolean(String(process.env.OPENROUTER_API_KEY || "").trim()),
      hint: requiresOpenRouter ? "Required when OPERATOR_ENGINE is not local" : "Optional in local mode",
    },
    {
      key: "REGEN_COMPUTE_OFFSET_ENABLED",
      required: false,
      present: Boolean(String(process.env.REGEN_COMPUTE_OFFSET_ENABLED || "").trim()),
      hint: "Optional realtime offset lane toggle",
    },
  ];
  return list;
}

function requiredEnvPass(list: OpenClawEnvCheckItem[]): boolean {
  for (const row of list) {
    if (row.required && !row.present) return false;
  }
  return true;
}

function parseLatestBlock(response: MCPResponse): number | undefined {
  if (!response || !response.data || typeof response.data !== "object") {
    return undefined;
  }
  const value = (response.data as Record<string, unknown>).latestBlock;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function parseStub(response: MCPResponse): boolean {
  if (!response || !response.data || typeof response.data !== "object") {
    return false;
  }
  return (response.data as Record<string, unknown>).stub === true;
}

function routeExists(route: string): boolean {
  const relative = route.replace(/^\//, "");
  return existsSync(path.join(COCKPIT_ROOT, "src", "app", relative, "route.ts"));
}

async function checkDashboardReachability(urlValue: string): Promise<{
  configured: boolean;
  reachable: boolean;
  statusCode?: number;
  error?: string;
}> {
  const trimmed = String(urlValue || "").trim();
  if (!trimmed) {
    return { configured: false, reachable: false, error: "missing_dashboard_url" };
  }
  const timeoutMs = 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(trimmed, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return {
      configured: true,
      reachable: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `dashboard_http_${response.status}`,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      error: error instanceof Error ? error.message : "dashboard_unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runStep(args: [string, ...string[]], cwd: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const [command, ...rest] = args;
    const child = spawn(command, rest, {
      cwd,
      env: {
        ...process.env,
        CI: "1",
        FORCE_COLOR: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      child.kill("SIGTERM");
      resolve({
        exitCode: 124,
        stdout: trimOutput(stdout),
        stderr: trimOutput(`${stderr}\nTimed out after ${STEP_TIMEOUT_MS}ms`),
      });
    }, STEP_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: Error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: trimOutput(stdout),
        stderr: trimOutput(`${stderr}\n${error.message}`),
      });
    });

    child.on("close", (code: number | null) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
      });
    });
  });
}

async function executeCommand(input: RunInput): Promise<OpsRunResult> {
  const startedAt = Date.now();
  const effectiveRole = resolveServerRole();
  const command = getOpsCommandById(input.commandId);

  if (!command) {
    return {
      ok: false,
      commandId: input.commandId,
      role: effectiveRole,
      startedAt,
      endedAt: Date.now(),
      steps: [],
      error: "command_not_found",
    };
  }

  if (!hasAccess(effectiveRole, command)) {
    return {
      ok: false,
      commandId: input.commandId,
      role: effectiveRole,
      startedAt,
      endedAt: Date.now(),
      steps: [],
      error: "role_denied",
    };
  }

  const stepResults: OpsStepResult[] = [];

  for (const step of command.steps) {
    const cwd = toCwd(step.cwd);
    const output = await runStep(step.args, cwd);
    const commandString = step.args.join(" ");
    const stepResult: OpsStepResult = {
      command: commandString,
      cwd: step.cwd,
      exitCode: output.exitCode,
      ok: output.exitCode === 0,
      stdout: output.stdout,
      stderr: output.stderr,
    };
    stepResults.push(stepResult);

    if (!stepResult.ok) {
      return {
        ok: false,
        commandId: command.id,
        role: effectiveRole,
        startedAt,
        endedAt: Date.now(),
        steps: stepResults,
        error: "step_failed",
      };
    }
  }

  return {
    ok: true,
    commandId: command.id,
    role: effectiveRole,
    startedAt,
    endedAt: Date.now(),
    steps: stepResults,
  };
}

export async function runOpsCommandAction(input: RunInput): Promise<OpsRunResult> {
  const result = await executeCommand(input);
  revalidatePath("/ops/control");
  return result;
}

export async function runOpsSequenceAction(input: {
  role?: OpsRole;
  commandIds: string[];
}): Promise<OpsSequenceResult> {
  const startedAt = Date.now();
  const effectiveRole = resolveServerRole();
  const runs: OpsRunResult[] = [];

  for (const commandId of input.commandIds) {
    const run = await executeCommand({ role: effectiveRole, commandId });
    runs.push(run);
    if (!run.ok) {
      revalidatePath("/ops/control");
      return {
        ok: false,
        role: effectiveRole,
        commandIds: input.commandIds,
        startedAt,
        endedAt: Date.now(),
        runs,
        error: `sequence_failed_at:${commandId}`,
      };
    }
  }

  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    commandIds: input.commandIds,
    startedAt,
    endedAt: Date.now(),
    runs,
  };
}

export async function planOpsSequenceFromGoalAction(input: {
  role?: OpsRole;
  goal: string;
}): Promise<OpsPlanResult> {
  const effectiveRole = resolveServerRole();
  const goal = String(input.goal || "").trim();
  const normalized = goal.toLowerCase();
  const commandSet = new Set<string>();
  const rationale: string[] = [];

  if (!goal) {
    commandSet.add("health_fast");
    rationale.push("No goal provided, defaulted to fast health check.");
  }

  if (/(build|compile|next build|ship)/.test(normalized)) {
    commandSet.add("cockpit_build");
    rationale.push("Added build check from goal intent.");
  }
  if (/(type|tsc|typescript)/.test(normalized)) {
    commandSet.add("cockpit_types");
    rationale.push("Added typecheck from goal intent.");
  }
  if (/(visual|ui|screenshot|ai eyes)/.test(normalized)) {
    commandSet.add("ui_eyes");
    rationale.push("Added visual smoke from goal intent.");
  }
  if (/(mcp|regen mcp|registry review|koi|python mcp)/.test(normalized)) {
    commandSet.add("mcp_connectors");
    rationale.push("Added MCP connector checks from goal intent.");
  }
  if (/(policy|guard|drift|contract|health|safe|readiness|ops)/.test(normalized)) {
    commandSet.add("health_fast");
    rationale.push("Added health-fast guard lane from goal intent.");
  }
  if (/(repo|git|status)/.test(normalized)) {
    commandSet.add("repo_status");
    rationale.push("Added repo status from goal intent.");
  }

  if (commandSet.size === 0) {
    commandSet.add("health_fast");
    rationale.push("No specific command match, defaulted to fast health check.");
  }

  const ordered = ["repo_status", "mcp_connectors", "health_fast", "cockpit_build", "cockpit_types", "ui_eyes"];
  const commandIds = ordered.filter((id) => commandSet.has(id));

  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    goal,
    commandIds,
    rationale,
  };
}

export async function readAIEyesArtifactsAction(): Promise<AIEyesArtifacts> {
  try {
    const screenshots = (await fs.readdir(AI_EYES_DIR))
      .filter((fileName) => fileName.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b));
    const jsonPath = path.join(AI_EYES_DIR, "report.json");
    const markdownPath = path.join(AI_EYES_DIR, "report.md");
    const [jsonText, markdownText, jsonStats] = await Promise.all([
      fs.readFile(jsonPath, "utf8").catch(() => ""),
      fs.readFile(markdownPath, "utf8").catch(() => ""),
      fs.stat(jsonPath).catch(() => null),
    ]);

    return {
      ok: true,
      updatedAt: jsonStats?.mtimeMs ? Math.round(jsonStats.mtimeMs) : undefined,
      reportJson: jsonText,
      reportMarkdown: markdownText,
      screenshots,
    };
  } catch {
    return {
      ok: false,
      error: "ai_eyes_not_found",
      screenshots: [],
    };
  }
}

export async function runOpenClawConnectionCheckAction(input: {
  role?: OpsRole;
}): Promise<OpenClawConnectionResult> {
  const checkedAt = Date.now();
  const effectiveRole = resolveServerRole();

  const env = toEnvCheck();
  const dashboard = await checkDashboardReachability(
    String(process.env.OPENCLAW_DASHBOARD_URL || "")
  );
  const routes = [
    "/api/health",
    "/api/policy",
    "/api/telegram/webhook",
    "/api/proof/feed",
    "/api/work",
  ].map((route) => ({ route, exists: routeExists(route) }));

  const envOk = requiredEnvPass(env);
  const routesOk = routes.every((row) => row.exists);
  const ok = envOk && routesOk && (dashboard.reachable || !dashboard.configured);

  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt,
    dashboard,
    env,
    routes,
    error: ok ? undefined : "openclaw_connection_check_failed",
  };
}

export async function runOpenClawSchedulerCheckAction(input: {
  role?: OpsRole;
}): Promise<OpenClawSchedulerResult> {
  const effectiveRole = resolveServerRole();
  const run = await executeCommand({
    role: effectiveRole,
    commandId: "health_fast",
  });
  revalidatePath("/ops/control");
  return {
    ok: run.ok,
    role: effectiveRole,
    checkedAt: Date.now(),
    run,
  };
}

export async function runOpenClawPolicyCheckAction(input: {
  role?: OpsRole;
}): Promise<OpenClawPolicyResult> {
  const effectiveRole = resolveServerRole();
  const startedAt = Date.now();
  const command: OpsCommandSpec = {
    id: "openclaw_policy_guard",
    title: "OpenClaw Policy Guard",
    description: "Run drift checks for policy and connector guardrails.",
    category: "health",
    roles: ["operator", "admin"],
    steps: [{ cwd: "repo", args: ["npm", "run", "drift:check"] }],
  };

  if (!hasAccess(effectiveRole, command)) {
    const denied: OpsRunResult = {
      ok: false,
      commandId: command.id,
      role: effectiveRole,
      startedAt,
      endedAt: Date.now(),
      steps: [],
      error: "role_denied",
    };
    return {
      ok: false,
      role: effectiveRole,
      checkedAt: Date.now(),
      run: denied,
    };
  }

  const stepResults: OpsStepResult[] = [];
  for (const step of command.steps) {
    const output = await runStep(step.args, toCwd(step.cwd));
    stepResults.push({
      command: step.args.join(" "),
      cwd: step.cwd,
      exitCode: output.exitCode,
      ok: output.exitCode === 0,
      stdout: output.stdout,
      stderr: output.stderr,
    });
    if (output.exitCode !== 0) {
      const failed: OpsRunResult = {
        ok: false,
        commandId: command.id,
        role: effectiveRole,
        startedAt,
        endedAt: Date.now(),
        steps: stepResults,
        error: "step_failed",
      };
      return {
        ok: false,
        role: effectiveRole,
        checkedAt: Date.now(),
        run: failed,
      };
    }
  }

  const passed: OpsRunResult = {
    ok: true,
    commandId: command.id,
    role: effectiveRole,
    startedAt,
    endedAt: Date.now(),
    steps: stepResults,
  };
  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt: Date.now(),
    run: passed,
  };
}

export async function runMCPConnectorCheckAction(input: {
  role?: OpsRole;
}): Promise<MCPConnectorCheckResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const client = createStubMCPClient();
  const checks: Array<{
    id: MCPConnectorStatus["id"];
    chain: MCPChain;
    endpointKey: MCPConnectorStatus["endpointKey"];
  }> = [
    { id: "regen", chain: "regen", endpointKey: "REGEN_MCP_URL" },
    {
      id: "registry-review",
      chain: "registry-review",
      endpointKey: "REGISTRY_REVIEW_MCP_URL",
    },
    { id: "regen-koi", chain: "regen-koi", endpointKey: "REGEN_KOI_MCP_URL" },
    {
      id: "regen-python",
      chain: "regen-python",
      endpointKey: "REGEN_PYTHON_MCP_URL",
    },
  ];

  const connectors = await Promise.all(
    checks.map(async (check): Promise<MCPConnectorStatus> => {
      const configured = Boolean(String(process.env[check.endpointKey] || "").trim());
      try {
        const response = await client.request(check.chain, {
          method: "latest_block",
        });
        const latestBlock = parseLatestBlock(response);
        const stub = parseStub(response);
        const ok = response.ok && (typeof latestBlock === "number" || stub);
        return {
          id: check.id,
          endpointKey: check.endpointKey,
          configured,
          ok,
          latestBlock,
          stub: stub || undefined,
          error: ok ? undefined : response.error || "invalid_latest_block",
        };
      } catch (error) {
        return {
          id: check.id,
          endpointKey: check.endpointKey,
          configured,
          ok: false,
          error: error instanceof Error ? error.message : "mcp_request_failed",
        };
      }
    })
  );

  const ok = connectors.every((connector) => connector.ok);
  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt,
    connectors,
    error: ok ? undefined : "mcp_connectors_check_failed",
  };
}

export async function runOpenClawBootstrapAction(input: {
  role?: OpsRole;
}): Promise<OpenClawBootstrapResult> {
  const effectiveRole = resolveServerRole();
  const connection = await runOpenClawConnectionCheckAction(input);
  const scheduler = await runOpenClawSchedulerCheckAction(input);
  const policy = await runOpenClawPolicyCheckAction(input);
  const mcp = await runMCPConnectorCheckAction(input);
  const ok = connection.ok && scheduler.ok && policy.ok && mcp.ok;
  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt: Date.now(),
    steps: { connection, scheduler, policy, mcp },
  };
}
