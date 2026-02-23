"use server";

import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getOpsCommandById, type OpsCommandSpec, type OpsRole } from "./commands";
import { createStubMCPClient } from "@/mcp";
import type { MCPChain, MCPResponse } from "@/mcp/types";
import {
  buildSocialAutopublishPrompt,
  SOCIAL_AUTOPUBLISH_ORDER,
  type SocialAutopublishInput,
  type SocialChannel,
} from "@/lib/operator/templates/social";
import {
  appendWorkEvent,
  createWork,
  getWork,
  listWork,
  updateWork,
  type WorkItem,
  type WorkPriority,
  type WorkStatus,
} from "@/lib/work";
import { enforcePolicy } from "@/lib/policy/enforce";
import type { PolicyAction } from "@/lib/policy/types";

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

export type OpsWorkOrderContract = {
  version: "netnet.workorder.v1";
  goal: string;
  commandIds: string[];
  rationale: string[];
  acceptanceChecks: Array<{
    commandId: string;
    required: boolean;
  }>;
  constraints: {
    policyMode: "proposal_first";
    requireApproval: true;
    requireIntentLock: true;
    roleBoundary: OpsRole;
    maxBudgetUsd: number;
  };
  outputs: {
    required: string[];
  };
  incentives: {
    payoutUsdCap: number;
    liquidityPledge?: {
      enabled: true;
      mechanism: "ecowealth-pledge-v0";
      chainId: 8453;
      ecoToken: "0x170dc0ca26f1247ced627d8abcafa90ecf1e1519";
      partnerToken?: string;
      ecoMatchedCapWei?: string;
      notes: string;
    };
  };
  socialAutopublish?: {
    enabled: true;
    order: SocialChannel[];
    topic: string;
    schedule: string;
    callToAction: string;
    tone: string;
    prompt: string;
    connectors: Array<{
      channel: SocialChannel;
      route: string;
      available: boolean;
    }>;
  };
};

export type OpsWorkOrderResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId?: string;
  title?: string;
  contract?: OpsWorkOrderContract;
  error?: string;
};

type OpenClawRemoteResult = {
  requested: boolean;
  ok: boolean;
  endpoint?: string;
  statusCode?: number;
  mode: "remote" | "stub";
  response?: unknown;
  error?: string;
};

export type VealthDispatchStatus = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  state: "created" | "dispatched" | "running" | "stopped" | "unknown" | "error";
  contract?: OpsWorkOrderContract;
  remote?: OpenClawRemoteResult;
  lastEventType?: string;
  lastEventAt?: string;
  error?: string;
};

export type VealthVerificationResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  checks: Array<{
    commandId: string;
    required: boolean;
    ok: boolean;
    exitCode?: number;
    error?: string;
  }>;
  passedRequired: number;
  totalRequired: number;
  payoutEligible: boolean;
  payoutCapUsd: number;
  error?: string;
};

export type VealthPayoutAuthorizationResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  payoutEligible: boolean;
  payoutCapUsd: number;
  authorizedUsd?: number;
  error?: string;
};

export type VealthQueueTickResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  dryRun: boolean;
  workId?: string;
  nextAction: "dispatch" | "verify" | "payout" | "none";
  details: string;
  dispatch?: VealthDispatchStatus;
  verification?: VealthVerificationResult;
  payout?: VealthPayoutAuthorizationResult;
  error?: string;
};

export type VealthQueueListItem = {
  workId: string;
  title: string;
  owner?: string;
  priority: WorkPriority;
  status: WorkStatus;
  updatedAt: string;
  dispatchState: VealthDispatchStatus["state"];
  hasContract: boolean;
  hasSocialAutopublish: boolean;
  verificationOk: boolean;
  payoutAuthorized: boolean;
};

export type VealthQueueSnapshotResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  items: VealthQueueListItem[];
  error?: string;
};

export type VealthQueueBatchResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  dryRun: boolean;
  limit: number;
  runs: VealthQueueTickResult[];
  error?: string;
};

export type VealthWorkOrderContextResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  title?: string;
  contract?: OpsWorkOrderContract;
  dispatchState?: VealthDispatchStatus["state"];
  verification?: ReturnType<typeof extractLatestVerification>;
  payout?: ReturnType<typeof extractLatestPayout>;
  error?: string;
};

export type SocialAutopublishReadinessResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  channels: Array<{
    channel: SocialChannel;
    route: string;
    exists: boolean;
  }>;
  allRoutesPresent: boolean;
  details: string;
};

export type VealthStaleGuardResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  staleAfterHours: number;
  scanned: number;
  escalatedCount: number;
  staleItems: Array<{
    workId: string;
    title: string;
    dispatchState: VealthDispatchStatus["state"];
    ageHours: number;
    alreadyEscalated: boolean;
  }>;
  error?: string;
};

export type SocialAutopublishPacketsResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  prompt?: string;
  topic?: string;
  schedule?: string;
  packets: Array<{
    channel: SocialChannel;
    route: string;
    title: string;
    status: "draft";
    available: boolean;
    body: Record<string, unknown>;
  }>;
  error?: string;
};

export type VealthHandoffBundleResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  workId: string;
  bundle?: Record<string, unknown>;
  error?: string;
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

export type BankrEnvCheckItem = {
  key: string;
  required: boolean;
  present: boolean;
  lane: "propose" | "execute";
  hint?: string;
};

export type BankrReadinessResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  env: BankrEnvCheckItem[];
  routes: Array<{ route: string; exists: boolean }>;
  policy: Array<{
    action: PolicyAction;
    ok: boolean;
    reasons: string[];
  }>;
  error?: string;
};

export type BankrBootstrapResult = {
  ok: boolean;
  role: OpsRole;
  checkedAt: number;
  steps: {
    readiness: BankrReadinessResult;
    smoke: OpsRunResult;
  };
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
      key: "OPENCLAW_WORKORDER_ENDPOINT",
      required: false,
      present: Boolean(String(process.env.OPENCLAW_WORKORDER_ENDPOINT || "").trim()),
      hint: "Optional dispatch endpoint path (default /api/agent/work-orders)",
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

function toBankrEnvCheck(): BankrEnvCheckItem[] {
  return [
    {
      key: "BANKR_API_BASE_URL",
      required: false,
      present: Boolean(String(process.env.BANKR_API_BASE_URL || "").trim()),
      lane: "propose",
      hint: "Optional remote proposal relay endpoint.",
    },
    {
      key: "BANKR_WALLET_API_BASE_URL",
      required: false,
      present: Boolean(String(process.env.BANKR_WALLET_API_BASE_URL || "").trim()),
      lane: "propose",
      hint: "Optional wallet read relay endpoint.",
    },
    {
      key: "PRIVY_APP_ID",
      required: true,
      present: Boolean(String(process.env.PRIVY_APP_ID || "").trim()),
      lane: "execute",
      hint: "Required for execute_privy write lane.",
    },
    {
      key: "PRIVY_APP_SECRET",
      required: true,
      present: Boolean(String(process.env.PRIVY_APP_SECRET || "").trim()),
      lane: "execute",
      hint: "Required for execute_privy write lane.",
    },
  ];
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

function deriveCommandsFromGoal(goal: string): {
  goal: string;
  commandIds: string[];
  rationale: string[];
} {
  const trimmed = String(goal || "").trim();
  const normalized = trimmed.toLowerCase();
  const commandSet = new Set<string>();
  const rationale: string[] = [];

  if (!trimmed) {
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
  if (/(bankr|wallet|launch|token actions|token info|privy)/.test(normalized)) {
    commandSet.add("bankr_readiness");
    rationale.push("Added Bankr readiness checks from goal intent.");
  }
  if (/(bankr).*(smoke|test)|bankr smoke|bankr suite/.test(normalized)) {
    commandSet.add("bankr_smoke");
    rationale.push("Added Bankr smoke suite from goal intent.");
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

  const ordered = [
    "repo_status",
    "mcp_connectors",
    "bankr_readiness",
    "bankr_smoke",
    "health_fast",
    "cockpit_build",
    "cockpit_types",
    "ui_eyes",
  ];
  return {
    goal: trimmed,
    commandIds: ordered.filter((id) => commandSet.has(id)),
    rationale,
  };
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
  const plan = deriveCommandsFromGoal(input.goal);

  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    goal: plan.goal,
    commandIds: plan.commandIds,
    rationale: plan.rationale,
  };
}

function readPriority(value: unknown): WorkPriority {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "CRITICAL") {
    return value;
  }
  return "MEDIUM";
}

function readBudget(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function normalizeAddress(value: unknown): string | undefined {
  const raw = String(value || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  return raw.toLowerCase();
}

function normalizeWei(value: unknown): string | undefined {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return undefined;
  return raw;
}

function socialRouteForChannel(channel: SocialChannel): string {
  if (channel === "youtube") return "/api/agent/youtube";
  if (channel === "x") return "/api/agent/x";
  if (channel === "instagram") return "/api/agent/instagram";
  return "/api/agent/facebook";
}

function buildSocialAutopublishContract(
  input: SocialAutopublishInput
): NonNullable<OpsWorkOrderContract["socialAutopublish"]> {
  const topic = String(input.topic || "").trim() || "Weekly operator recap";
  const schedule = String(input.schedule || "").trim() || "today 9am local";
  const callToAction =
    String(input.callToAction || "").trim() || "Reply for details";
  const tone = String(input.tone || "").trim() || "clear and concise";
  const prompt = buildSocialAutopublishPrompt({
    topic,
    schedule,
    callToAction,
    tone,
  });
  const connectors = SOCIAL_AUTOPUBLISH_ORDER.map((channel) => {
    const route = socialRouteForChannel(channel);
    return {
      channel,
      route,
      available: routeExists(route),
    };
  });
  return {
    enabled: true,
    order: [...SOCIAL_AUTOPUBLISH_ORDER],
    topic,
    schedule,
    callToAction,
    tone,
    prompt,
    connectors,
  };
}

function toWorkOrderTitle(goal: string): string {
  const single = String(goal || "").replace(/\s+/g, " ").trim() || "Untitled work order";
  const short = single.length > 72 ? `${single.slice(0, 72)}...` : single;
  return `Vealth Work Order: ${short}`;
}

function buildWorkOrderContract(args: {
  goal: string;
  role: OpsRole;
  budgetUsd: number;
  commandIds: string[];
  rationale: string[];
  liquidityPledgeEnabled: boolean;
  liquidityPledgePartnerToken?: string;
  liquidityPledgeCapWei?: string;
  socialAutopublish?: NonNullable<OpsWorkOrderContract["socialAutopublish"]>;
}): OpsWorkOrderContract {
  const pledge =
    args.liquidityPledgeEnabled
      ? {
          enabled: true as const,
          mechanism: "ecowealth-pledge-v0" as const,
          chainId: 8453 as const,
          ecoToken: "0x170dc0ca26f1247ced627d8abcafa90ecf1e1519" as const,
          partnerToken: args.liquidityPledgePartnerToken,
          ecoMatchedCapWei: args.liquidityPledgeCapWei,
          notes:
            "Whitelist-only pledge: match partner token with ECO and lock LP principal in vault.",
        }
      : undefined;

  return {
    version: "netnet.workorder.v1",
    goal: args.goal,
    commandIds: args.commandIds,
    rationale: args.rationale,
    acceptanceChecks: args.commandIds.map((commandId) => ({
      commandId,
      required: true,
    })),
    constraints: {
      policyMode: "proposal_first",
      requireApproval: true,
      requireIntentLock: true,
      roleBoundary: args.role,
      maxBudgetUsd: args.budgetUsd,
    },
    outputs: {
      required: [
        "code_diff_or_noop_note",
        "verification_results_with_exit_codes",
        "proof_or_audit_event_reference",
      ],
    },
    incentives: {
      payoutUsdCap: args.budgetUsd,
      liquidityPledge: pledge,
    },
    socialAutopublish: args.socialAutopublish,
  };
}

function createAcceptanceCriteria(contract: OpsWorkOrderContract): string {
  const checks = contract.acceptanceChecks
    .map((check) => `- ${check.commandId}: pass`)
    .join("\n");
  const lines = [
    "Execute with proposal-first guardrails and return deterministic evidence.",
    "Required checks:",
    checks,
    "Attach proof/audit reference and include real exit codes.",
  ];
  if (contract.socialAutopublish?.enabled) {
    lines.push(
      `Social sequence order: ${contract.socialAutopublish.order.join(" -> ")}.`,
      "Do not execute posting automatically; keep proposals as draft until approved + locked."
    );
  }
  return lines.join("\n");
}

export async function createVealthWorkOrderAction(input: {
  role?: OpsRole;
  goal: string;
  owner?: string;
  budgetUsd?: number;
  priority?: WorkPriority;
  liquidityPledgeEnabled?: boolean;
  liquidityPledgePartnerToken?: string;
  liquidityPledgeCapWei?: string;
  socialAutopublish?: NonNullable<OpsWorkOrderContract["socialAutopublish"]>;
}): Promise<OpsWorkOrderResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const goal = String(input.goal || "").trim();
  if (!goal) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      error: "goal_required",
    };
  }

  const plan = deriveCommandsFromGoal(goal);
  const budgetUsd = readBudget(input.budgetUsd);
  const liquidityPledgeEnabled = readBool(input.liquidityPledgeEnabled);
  const liquidityPledgePartnerToken = normalizeAddress(input.liquidityPledgePartnerToken);
  const liquidityPledgeCapWei = normalizeWei(input.liquidityPledgeCapWei);
  const contract = buildWorkOrderContract({
    goal: plan.goal,
    role: effectiveRole,
    budgetUsd,
    commandIds: plan.commandIds,
    rationale: plan.rationale,
    liquidityPledgeEnabled,
    liquidityPledgePartnerToken,
    liquidityPledgeCapWei,
    socialAutopublish: input.socialAutopublish,
  });

  const work = createWork({
    title: toWorkOrderTitle(goal),
    description: [
      "Machine-dispatched work order for Vealth/OpenClaw execution.",
      `Goal: ${plan.goal}`,
      `Command lane: ${plan.commandIds.join(" -> ")}`,
      `Budget cap (USD): ${contract.constraints.maxBudgetUsd}`,
      liquidityPledgeEnabled
        ? `Liquidity pledge: enabled (partner=${liquidityPledgePartnerToken || "unset"}, capWei=${liquidityPledgeCapWei || "unset"})`
        : "Liquidity pledge: disabled",
      contract.socialAutopublish?.enabled
        ? `Social sequence: ${contract.socialAutopublish.order.join(" -> ")} (${contract.socialAutopublish.schedule})`
        : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    owner: String(input.owner || "vealth").trim() || "vealth",
    priority: readPriority(input.priority),
    acceptanceCriteria: createAcceptanceCriteria(contract),
    escalationPolicy:
      "If any required check fails, report blocker + context and request operator review.",
    actor: "operator",
    tags: ["vealth", "work-order", "ops-control"],
  });

  const withEvent: WorkItem | null = appendWorkEvent(work.id, {
    type: "APPROVAL_REQUESTED",
    by: "operator",
    note: "Vealth work order created from ops control.",
    patch: {
      workOrderContract: contract,
    },
  });

  revalidatePath("/ops/control");
  revalidatePath("/work");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    workId: withEvent?.id || work.id,
    title: withEvent?.title || work.title,
    contract,
  };
}

export async function createSocialAutopublishWorkOrderAction(input: {
  role?: OpsRole;
  owner?: string;
  budgetUsd?: number;
  priority?: WorkPriority;
  topic?: string;
  schedule?: string;
  callToAction?: string;
  tone?: string;
}): Promise<OpsWorkOrderResult> {
  const socialAutopublish = buildSocialAutopublishContract({
    topic: input.topic,
    schedule: input.schedule,
    callToAction: input.callToAction,
    tone: input.tone,
  });
  const goal = [
    "Social autopublish sequence",
    `order=${socialAutopublish.order.join("->")}`,
    `topic=${socialAutopublish.topic}`,
    `schedule=${socialAutopublish.schedule}`,
  ].join(" | ");
  return createVealthWorkOrderAction({
    role: input.role,
    goal,
    owner: input.owner || "vealth-social",
    budgetUsd: input.budgetUsd,
    priority: input.priority || "MEDIUM",
    socialAutopublish,
  });
}

function canOperateVealth(role: OpsRole): boolean {
  return role === "operator" || role === "admin";
}

function extractWorkOrderContract(item: WorkItem): OpsWorkOrderContract | undefined {
  const events = [...item.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  for (const event of events) {
    const patch =
      event.patch && typeof event.patch === "object" && !Array.isArray(event.patch)
        ? (event.patch as Record<string, unknown>)
        : undefined;
    const contract =
      patch &&
      patch.workOrderContract &&
      typeof patch.workOrderContract === "object" &&
      !Array.isArray(patch.workOrderContract)
        ? (patch.workOrderContract as OpsWorkOrderContract)
        : undefined;
    if (contract?.version === "netnet.workorder.v1") {
      return contract;
    }
  }
  return undefined;
}

function deriveDispatchState(item: WorkItem): VealthDispatchStatus["state"] {
  const events = [...item.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  for (const event of events) {
    const patch =
      event.patch && typeof event.patch === "object" && !Array.isArray(event.patch)
        ? (event.patch as Record<string, unknown>)
        : undefined;
    const dispatch =
      patch &&
      patch.dispatch &&
      typeof patch.dispatch === "object" &&
      !Array.isArray(patch.dispatch)
        ? (patch.dispatch as Record<string, unknown>)
        : undefined;
    if (dispatch && typeof dispatch.state === "string") {
      const state = dispatch.state;
      if (
        state === "created" ||
        state === "dispatched" ||
        state === "running" ||
        state === "stopped" ||
        state === "unknown" ||
        state === "error"
      ) {
        return state;
      }
    }
  }
  return "created";
}

function extractLatestVerification(item: WorkItem): {
  ok: boolean;
  checkedAt?: number;
  payoutEligible?: boolean;
  payoutCapUsd?: number;
} | null {
  const events = [...item.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  for (const event of events) {
    const patch =
      event.patch && typeof event.patch === "object" && !Array.isArray(event.patch)
        ? (event.patch as Record<string, unknown>)
        : undefined;
    const verification =
      patch &&
      patch.verification &&
      typeof patch.verification === "object" &&
      !Array.isArray(patch.verification)
        ? (patch.verification as Record<string, unknown>)
        : undefined;
    if (!verification) continue;
    const ok = verification.ok === true;
    const checkedAtRaw = Number(verification.checkedAt);
    const payoutCapUsdRaw = Number(verification.payoutCapUsd);
    return {
      ok,
      checkedAt: Number.isFinite(checkedAtRaw) ? checkedAtRaw : undefined,
      payoutEligible: verification.payoutEligible === true,
      payoutCapUsd: Number.isFinite(payoutCapUsdRaw) ? payoutCapUsdRaw : undefined,
    };
  }
  return null;
}

function extractLatestPayout(item: WorkItem): {
  authorizedUsd?: number;
  approvedAt?: string;
} | null {
  const events = [...item.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  for (const event of events) {
    const patch =
      event.patch && typeof event.patch === "object" && !Array.isArray(event.patch)
        ? (event.patch as Record<string, unknown>)
        : undefined;
    const payout =
      patch &&
      patch.payout &&
      typeof patch.payout === "object" &&
      !Array.isArray(patch.payout)
        ? (patch.payout as Record<string, unknown>)
        : undefined;
    if (!payout) continue;
    const authorizedUsdRaw = Number(payout.authorizedUsd);
    return {
      authorizedUsd: Number.isFinite(authorizedUsdRaw) ? authorizedUsdRaw : undefined,
      approvedAt: event.at,
    };
  }
  return null;
}

function requiredChecksFromContract(contract: OpsWorkOrderContract): Array<{
  commandId: string;
  required: boolean;
}> {
  if (Array.isArray(contract.acceptanceChecks) && contract.acceptanceChecks.length > 0) {
    return contract.acceptanceChecks.map((check) => ({
      commandId: String(check.commandId || "").trim(),
      required: check.required !== false,
    }));
  }
  return (contract.commandIds || []).map((commandId) => ({
    commandId: String(commandId || "").trim(),
    required: true,
  }));
}

function priorityWeight(priority: WorkPriority): number {
  if (priority === "CRITICAL") return 4;
  if (priority === "HIGH") return 3;
  if (priority === "MEDIUM") return 2;
  return 1;
}

function isVealthQueueCandidate(item: WorkItem): boolean {
  if (item.status === "DONE" || item.status === "CANCELED") return false;
  const owner = String(item.owner || "").toLowerCase();
  const tags = item.tags || [];
  return owner.includes("vealth") || tags.includes("work-order");
}

function sortVealthQueue(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (byPriority !== 0) return byPriority;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

function toVealthQueueListItem(item: WorkItem): VealthQueueListItem {
  const contract = extractWorkOrderContract(item);
  const verification = extractLatestVerification(item);
  const payout = extractLatestPayout(item);
  return {
    workId: item.id,
    title: item.title,
    owner: item.owner,
    priority: item.priority,
    status: item.status,
    updatedAt: item.updatedAt,
    dispatchState: deriveDispatchState(item),
    hasContract: Boolean(contract),
    hasSocialAutopublish: contract?.socialAutopublish?.enabled === true,
    verificationOk: verification?.ok === true,
    payoutAuthorized: typeof payout?.authorizedUsd === "number" && payout.authorizedUsd > 0,
  };
}

function latestWorkEvent(item: WorkItem) {
  return [...item.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
}

function hasRecentStaleEscalation(item: WorkItem): boolean {
  const latest = latestWorkEvent(item);
  if (!latest) return false;
  return latest.type === "ESCALATED" && String(latest.note || "").includes("stale_guard");
}

function itemAgeHours(item: WorkItem): number {
  const updatedMs = Date.parse(item.updatedAt);
  if (!Number.isFinite(updatedMs)) return 0;
  return Math.max(0, (Date.now() - updatedMs) / (60 * 60 * 1000));
}

function deriveQueueNextAction(item: WorkItem): VealthQueueTickResult["nextAction"] {
  const dispatchState = deriveDispatchState(item);
  const verification = extractLatestVerification(item);
  const payout = extractLatestPayout(item);
  if (dispatchState === "created" || dispatchState === "error") {
    return "dispatch";
  }
  if (!verification?.ok) {
    return "verify";
  }
  if (!payout?.authorizedUsd) {
    return "payout";
  }
  return "none";
}

async function callOpenClawDispatch(action: string, payload: Record<string, unknown>): Promise<OpenClawRemoteResult> {
  const dashboard = String(process.env.OPENCLAW_DASHBOARD_URL || "").trim();
  const apiKey = String(process.env.OPENCLAW_API_KEY || "").trim();
  const endpointPath = String(process.env.OPENCLAW_WORKORDER_ENDPOINT || "/api/agent/work-orders").trim();
  const agentId = String(process.env.OPENCLAW_AGENT_ID || "").trim();
  const fallbackEndpoint = dashboard
    ? `${dashboard.replace(/\/$/, "")}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`
    : endpointPath;

  if (!dashboard || !apiKey) {
    return {
      requested: false,
      ok: true,
      mode: "stub",
      endpoint: fallbackEndpoint,
      response: {
        accepted: true,
        mode: "stub",
        reason: "missing_openclaw_dashboard_or_api_key",
        action,
        agentId: agentId || undefined,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const endpoint = new URL(endpointPath, dashboard).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        action,
        agentId: agentId || undefined,
        payload,
      }),
    });

    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    return {
      requested: true,
      ok: response.ok,
      mode: "remote",
      endpoint,
      statusCode: response.status,
      response: parsed,
      error: response.ok ? undefined : `openclaw_http_${response.status}`,
    };
  } catch (error) {
    return {
      requested: true,
      ok: false,
      mode: "remote",
      endpoint: fallbackEndpoint,
      error: error instanceof Error ? error.message : "openclaw_dispatch_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function toDispatchStatus(args: {
  role: OpsRole;
  checkedAt: number;
  item: WorkItem;
  remote?: OpenClawRemoteResult;
  error?: string;
}): VealthDispatchStatus {
  const latestEvent = latestWorkEvent(args.item);
  return {
    ok: !args.error,
    role: args.role,
    checkedAt: args.checkedAt,
    workId: args.item.id,
    state: deriveDispatchState(args.item),
    contract: extractWorkOrderContract(args.item),
    remote: args.remote,
    lastEventType: latestEvent?.type,
    lastEventAt: latestEvent?.at,
    error: args.error,
  };
}

export async function dispatchVealthWorkOrderAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<VealthDispatchStatus> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      state: "error",
      error: "work_id_required",
    };
  }
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "role_denied",
    };
  }

  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "work_not_found",
    };
  }

  const contract = extractWorkOrderContract(item);
  const payload = {
    workId: item.id,
    title: item.title,
    owner: item.owner || "vealth",
    contract,
  };
  const remote = await callOpenClawDispatch("dispatch", payload);

  const next = appendWorkEvent(item.id, {
    type: "APPROVAL_REQUESTED",
    by: "operator",
    note: remote.ok ? "Dispatched to Vealth/OpenClaw." : "Dispatch failed for Vealth/OpenClaw.",
    patch: {
      dispatch: {
        state: remote.ok ? "dispatched" : "error",
        remote,
      },
    },
  });
  const finalItem = next || item;
  revalidatePath("/ops/control");
  revalidatePath("/work");
  return toDispatchStatus({
    role: effectiveRole,
    checkedAt,
    item: finalItem,
    remote,
    error: remote.ok ? undefined : remote.error || "dispatch_failed",
  });
}

export async function heartbeatVealthWorkOrderAction(input: {
  role?: OpsRole;
  workId: string;
  note?: string;
}): Promise<VealthDispatchStatus> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      state: "error",
      error: "work_id_required",
    };
  }
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "role_denied",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "work_not_found",
    };
  }

  const remote = await callOpenClawDispatch("heartbeat", {
    workId: item.id,
    title: item.title,
    note: String(input.note || "").trim() || undefined,
  });
  const next = appendWorkEvent(item.id, {
    type: "COMMENT",
    by: "operator",
    note: String(input.note || "").trim() || "Heartbeat sent to Vealth/OpenClaw.",
    patch: {
      dispatch: {
        state: "running",
        remote,
      },
    },
  });
  const finalItem = next || item;
  revalidatePath("/ops/control");
  revalidatePath("/work");
  return toDispatchStatus({
    role: effectiveRole,
    checkedAt,
    item: finalItem,
    remote,
    error: remote.ok ? undefined : remote.error || "heartbeat_failed",
  });
}

export async function stopVealthWorkOrderAction(input: {
  role?: OpsRole;
  workId: string;
  reason?: string;
}): Promise<VealthDispatchStatus> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      state: "error",
      error: "work_id_required",
    };
  }
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "role_denied",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "work_not_found",
    };
  }

  const reason = String(input.reason || "").trim() || "Operator requested stop.";
  const remote = await callOpenClawDispatch("stop", {
    workId: item.id,
    reason,
  });
  const next = appendWorkEvent(item.id, {
    type: "ESCALATED",
    by: "operator",
    note: reason,
    patch: {
      dispatch: {
        state: "stopped",
        remote,
      },
    },
  });
  const finalItem = next || item;
  revalidatePath("/ops/control");
  revalidatePath("/work");
  return toDispatchStatus({
    role: effectiveRole,
    checkedAt,
    item: finalItem,
    remote,
    error: remote.ok ? undefined : remote.error || "stop_failed",
  });
}

export async function getVealthWorkOrderStatusAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<VealthDispatchStatus> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      state: "error",
      error: "work_id_required",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      state: "error",
      error: "work_not_found",
    };
  }
  const remote = await callOpenClawDispatch("status", {
    workId: item.id,
    title: item.title,
  });
  revalidatePath("/ops/control");
  revalidatePath("/work");
  return toDispatchStatus({
    role: effectiveRole,
    checkedAt,
    item,
    remote,
    error: remote.ok ? undefined : remote.error || "status_failed",
  });
}

export async function verifyVealthWorkOrderAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<VealthVerificationResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      checks: [],
      passedRequired: 0,
      totalRequired: 0,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_id_required",
    };
  }
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      checks: [],
      passedRequired: 0,
      totalRequired: 0,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "role_denied",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      checks: [],
      passedRequired: 0,
      totalRequired: 0,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_not_found",
    };
  }
  const contract = extractWorkOrderContract(item);
  if (!contract) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      checks: [],
      passedRequired: 0,
      totalRequired: 0,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_order_contract_missing",
    };
  }

  const checks = requiredChecksFromContract(contract).filter((check) => check.commandId);
  const results: VealthVerificationResult["checks"] = [];
  for (const check of checks) {
    const run = await executeCommand({ role: effectiveRole, commandId: check.commandId });
    results.push({
      commandId: check.commandId,
      required: check.required,
      ok: run.ok,
      exitCode: run.steps.at(-1)?.exitCode,
      error: run.ok ? undefined : run.error || "command_failed",
    });
  }

  const required = results.filter((row) => row.required);
  const passedRequired = required.filter((row) => row.ok).length;
  const totalRequired = required.length;
  const ok = totalRequired === 0 ? true : passedRequired === totalRequired;
  const payoutCapUsd = readBudget(contract.incentives?.payoutUsdCap ?? 0);
  const payoutEligible = ok && payoutCapUsd > 0;

  appendWorkEvent(item.id, {
    type: "UPDATED",
    by: "operator",
    note: ok ? "Acceptance checks passed." : "Acceptance checks failed.",
    patch: {
      verification: {
        ok,
        checkedAt,
        checks: results,
        passedRequired,
        totalRequired,
        payoutEligible,
        payoutCapUsd,
      },
    },
  });

  revalidatePath("/ops/control");
  revalidatePath("/work");
  return {
    ok,
    role: effectiveRole,
    checkedAt,
    workId: item.id,
    checks: results,
    passedRequired,
    totalRequired,
    payoutEligible,
    payoutCapUsd,
    error: ok ? undefined : "verification_failed",
  };
}

export async function authorizeVealthPayoutAction(input: {
  role?: OpsRole;
  workId: string;
  amountUsd?: number;
  note?: string;
}): Promise<VealthPayoutAuthorizationResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_id_required",
    };
  }
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "role_denied",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_not_found",
    };
  }
  const contract = extractWorkOrderContract(item);
  if (!contract) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd: 0,
      error: "work_order_contract_missing",
    };
  }

  const verification = extractLatestVerification(item);
  if (!verification?.ok) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd: readBudget(contract.incentives?.payoutUsdCap ?? 0),
      error: "verification_required",
    };
  }

  const payoutCapUsd = readBudget(contract.incentives?.payoutUsdCap ?? 0);
  const requestedUsd =
    typeof input.amountUsd === "number" ? input.amountUsd : payoutCapUsd;
  const authorizedUsd = readBudget(requestedUsd);
  if (authorizedUsd <= 0) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd,
      error: "payout_amount_required",
    };
  }
  if (authorizedUsd > payoutCapUsd) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      payoutEligible: false,
      payoutCapUsd,
      authorizedUsd,
      error: "payout_over_cap",
    };
  }

  appendWorkEvent(item.id, {
    type: "APPROVED",
    by: "operator",
    note: String(input.note || "").trim() || `Payout authorized: ${authorizedUsd} USD`,
    patch: {
      payout: {
        authorizedUsd,
        payoutCapUsd,
        checkedAt,
        verificationCheckedAt: verification.checkedAt,
        liquidityPledge: contract.incentives?.liquidityPledge || undefined,
      },
    },
  });
  updateWork(item.id, {
    status: "DONE",
    actor: "operator",
    note: `Payout authorized (${authorizedUsd} USD).`,
  });

  revalidatePath("/ops/control");
  revalidatePath("/work");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    workId: item.id,
    payoutEligible: true,
    payoutCapUsd,
    authorizedUsd,
  };
}

export async function runVealthQueueTickAction(input: {
  role?: OpsRole;
  dryRun?: boolean;
  defaultPayoutUsd?: number;
}): Promise<VealthQueueTickResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      dryRun: input.dryRun !== false,
      nextAction: "none",
      details: "Role is not allowed to run queue ticks.",
      error: "role_denied",
    };
  }

  const candidates = sortVealthQueue(listWork().filter((item) => isVealthQueueCandidate(item)));

  const item = candidates[0];
  if (!item) {
    return {
      ok: true,
      role: effectiveRole,
      checkedAt,
      dryRun: input.dryRun !== false,
      nextAction: "none",
      details: "No eligible Vealth work orders in queue.",
    };
  }

  const nextAction = deriveQueueNextAction(item);

  const dryRun = input.dryRun !== false;
  if (dryRun || nextAction === "none") {
    return {
      ok: true,
      role: effectiveRole,
      checkedAt,
      dryRun,
      workId: item.id,
      nextAction,
      details:
        nextAction === "none"
          ? "Queue item already dispatched, verified, and paid."
          : `Next action for ${item.id}: ${nextAction}.`,
    };
  }

  if (nextAction === "dispatch") {
    const dispatch = await dispatchVealthWorkOrderAction({
      role: effectiveRole,
      workId: item.id,
    });
    return {
      ok: dispatch.ok,
      role: effectiveRole,
      checkedAt,
      dryRun: false,
      workId: item.id,
      nextAction,
      details: dispatch.ok
        ? `Dispatched ${item.id} to Vealth.`
        : `Dispatch failed for ${item.id}.`,
      dispatch,
      error: dispatch.error,
    };
  }

  if (nextAction === "verify") {
    const verify = await verifyVealthWorkOrderAction({
      role: effectiveRole,
      workId: item.id,
    });
    return {
      ok: verify.ok,
      role: effectiveRole,
      checkedAt,
      dryRun: false,
      workId: item.id,
      nextAction,
      details: verify.ok
        ? `Verification passed for ${item.id}.`
        : `Verification failed for ${item.id}.`,
      verification: verify,
      error: verify.error,
    };
  }

  const contract = extractWorkOrderContract(item);
  const fallbackPayout = readBudget(input.defaultPayoutUsd);
  const payoutAmount =
    fallbackPayout > 0
      ? fallbackPayout
      : readBudget(contract?.incentives?.payoutUsdCap ?? 0);
  const payoutResult = await authorizeVealthPayoutAction({
    role: effectiveRole,
    workId: item.id,
    amountUsd: payoutAmount,
    note: "Queue tick payout authorization.",
  });
  return {
    ok: payoutResult.ok,
    role: effectiveRole,
    checkedAt,
    dryRun: false,
    workId: item.id,
    nextAction,
    details: payoutResult.ok
      ? `Payout authorized for ${item.id}.`
      : `Payout authorization failed for ${item.id}.`,
    payout: payoutResult,
    error: payoutResult.error,
  };
}

export async function listVealthQueueAction(input?: {
  role?: OpsRole;
  limit?: number;
}): Promise<VealthQueueSnapshotResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const rawLimit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) ? input.limit : 12;
  const limit = Math.max(1, Math.min(50, Math.floor(rawLimit)));
  const items = sortVealthQueue(listWork().filter((item) => isVealthQueueCandidate(item)))
    .slice(0, limit)
    .map((item) => toVealthQueueListItem(item));
  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    items,
  };
}

export async function getVealthWorkOrderContextAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<VealthWorkOrderContextResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      error: "work_id_required",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      error: "work_not_found",
    };
  }
  const contract = extractWorkOrderContract(item);
  const verification = extractLatestVerification(item);
  const payout = extractLatestPayout(item);
  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    workId: item.id,
    title: item.title,
    contract,
    dispatchState: deriveDispatchState(item),
    verification,
    payout,
  };
}

export async function runVealthQueueBatchAction(input?: {
  role?: OpsRole;
  dryRun?: boolean;
  limit?: number;
  defaultPayoutUsd?: number;
}): Promise<VealthQueueBatchResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      dryRun: input?.dryRun !== false,
      limit: 0,
      runs: [],
      error: "role_denied",
    };
  }
  const dryRun = input?.dryRun !== false;
  const rawLimit =
    typeof input?.limit === "number" && Number.isFinite(input.limit) ? input.limit : 3;
  const normalizedLimit = Math.max(1, Math.min(10, Math.floor(rawLimit)));
  const limit = dryRun ? 1 : normalizedLimit;
  const runs: VealthQueueTickResult[] = [];
  for (let index = 0; index < limit; index += 1) {
    const run = await runVealthQueueTickAction({
      role: effectiveRole,
      dryRun,
      defaultPayoutUsd: input?.defaultPayoutUsd,
    });
    runs.push(run);
    if (!run.ok) break;
    if (run.nextAction === "none") break;
    if (dryRun) break;
  }
  const ok = runs.every((run) => run.ok);
  const failed = runs.find((run) => !run.ok);
  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt,
    dryRun,
    limit,
    runs,
    error: failed?.error,
  };
}

export async function runSocialAutopublishReadinessAction(input?: {
  role?: OpsRole;
}): Promise<SocialAutopublishReadinessResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const channels = SOCIAL_AUTOPUBLISH_ORDER.map((channel) => {
    const route = socialRouteForChannel(channel);
    return {
      channel,
      route,
      exists: routeExists(route),
    };
  });
  const allRoutesPresent = channels.every((channel) => channel.exists);
  const details = allRoutesPresent
    ? "All social connector routes are present."
    : "Missing one or more social connector routes; keep social lane proposal-first.";
  revalidatePath("/ops/control");
  return {
    ok: allRoutesPresent,
    role: effectiveRole,
    checkedAt,
    channels,
    allRoutesPresent,
    details,
  };
}

export async function runVealthStaleGuardAction(input?: {
  role?: OpsRole;
  staleAfterHours?: number;
  dryRun?: boolean;
}): Promise<VealthStaleGuardResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  if (!canOperateVealth(effectiveRole)) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      staleAfterHours: 0,
      scanned: 0,
      escalatedCount: 0,
      staleItems: [],
      error: "role_denied",
    };
  }

  const staleAfterRaw =
    typeof input?.staleAfterHours === "number" && Number.isFinite(input.staleAfterHours)
      ? input.staleAfterHours
      : 6;
  const staleAfterHours = Math.max(1, Math.min(168, Math.floor(staleAfterRaw)));
  const dryRun = input?.dryRun !== false;

  const candidates = sortVealthQueue(listWork().filter((item) => isVealthQueueCandidate(item)));
  const staleItems: VealthStaleGuardResult["staleItems"] = [];
  let escalatedCount = 0;

  for (const item of candidates) {
    const dispatchState = deriveDispatchState(item);
    if (dispatchState !== "running" && dispatchState !== "dispatched") continue;
    const ageHours = itemAgeHours(item);
    if (ageHours < staleAfterHours) continue;
    const alreadyEscalated = hasRecentStaleEscalation(item);
    staleItems.push({
      workId: item.id,
      title: item.title,
      dispatchState,
      ageHours: Math.round(ageHours * 10) / 10,
      alreadyEscalated,
    });
    if (!dryRun && !alreadyEscalated) {
      appendWorkEvent(item.id, {
        type: "ESCALATED",
        by: "operator",
        note: `stale_guard: stale running work order after ${Math.round(ageHours)}h`,
        patch: {
          staleGuard: {
            checkedAt,
            staleAfterHours,
            ageHours: Math.round(ageHours * 10) / 10,
            dispatchState,
          },
        },
      });
      escalatedCount += 1;
    }
  }

  revalidatePath("/ops/control");
  revalidatePath("/work");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    staleAfterHours,
    scanned: candidates.length,
    escalatedCount,
    staleItems,
  };
}

export async function buildSocialAutopublishPacketsAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<SocialAutopublishPacketsResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      packets: [],
      error: "work_id_required",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      packets: [],
      error: "work_not_found",
    };
  }
  const contract = extractWorkOrderContract(item);
  const social = contract?.socialAutopublish;
  if (!social?.enabled) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: item.id,
      packets: [],
      error: "social_autopublish_not_enabled",
    };
  }
  const packets = social.order.map((channel) => {
    const route = socialRouteForChannel(channel);
    return {
      channel,
      route,
      title: `${channel.toUpperCase()} proposal`,
      status: "draft" as const,
      available: routeExists(route),
      body: {
        channel,
        route,
        topic: social.topic,
        schedule: social.schedule,
        tone: social.tone,
        callToAction: social.callToAction,
        proposalMode: "draft_only",
      },
    };
  });
  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    workId: item.id,
    prompt: social.prompt,
    topic: social.topic,
    schedule: social.schedule,
    packets,
  };
}

export async function buildVealthHandoffBundleAction(input: {
  role?: OpsRole;
  workId: string;
}): Promise<VealthHandoffBundleResult> {
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const workId = String(input.workId || "").trim();
  if (!workId) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId: "",
      error: "work_id_required",
    };
  }
  const item = getWork(workId);
  if (!item) {
    return {
      ok: false,
      role: effectiveRole,
      checkedAt,
      workId,
      error: "work_not_found",
    };
  }
  const contract = extractWorkOrderContract(item);
  const verification = extractLatestVerification(item);
  const payout = extractLatestPayout(item);
  const dispatchState = deriveDispatchState(item);
  const nextAction = deriveQueueNextAction(item);
  const socialConnectors =
    contract?.socialAutopublish?.order.map((channel) => {
      const route = socialRouteForChannel(channel);
      return {
        channel,
        route,
        available: routeExists(route),
      };
    }) || [];

  const bundle = {
    generatedAt: checkedAt,
    workId: item.id,
    title: item.title,
    owner: item.owner,
    priority: item.priority,
    status: item.status,
    updatedAt: item.updatedAt,
    dispatchState,
    nextAction,
    verification,
    payout,
    contract,
    socialConnectors,
    latestEvent: latestWorkEvent(item) || null,
  } as Record<string, unknown>;

  revalidatePath("/ops/control");
  return {
    ok: true,
    role: effectiveRole,
    checkedAt,
    workId: item.id,
    bundle,
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

export async function runBankrReadinessCheckAction(input: {
  role?: OpsRole;
}): Promise<BankrReadinessResult> {
  void input;
  const effectiveRole = resolveServerRole();
  const checkedAt = Date.now();
  const env = toBankrEnvCheck();
  const routes = [
    "/api/bankr/wallet",
    "/api/bankr/token/info",
    "/api/bankr/token/actions",
    "/api/bankr/launch",
  ].map((route) => ({ route, exists: routeExists(route) }));

  const policyTargets: Array<{ action: PolicyAction; route: string }> = [
    { action: "bankr.wallet.read", route: "/api/bankr/wallet" },
    { action: "bankr.token.info", route: "/api/bankr/token/info" },
    { action: "bankr.token.actions", route: "/api/bankr/token/actions" },
    { action: "bankr.launch", route: "/api/bankr/launch" },
  ];

  const policy = policyTargets.map((target) => {
    const gate = enforcePolicy(target.action, {
      venue: "bankr",
      action: target.action,
      route: target.route,
      amountUsd: target.action === "bankr.launch" ? 25 : 0,
    });
    return {
      action: target.action,
      ok: gate.ok,
      reasons: gate.reasons,
    };
  });

  const envOk = requiredEnvPass(env);
  const routeOk = routes.every((row) => row.exists);
  const policyOk = policy.every((row) => row.ok);
  const ok = envOk && routeOk && policyOk;

  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt,
    env,
    routes,
    policy,
    error: ok ? undefined : "bankr_readiness_check_failed",
  };
}

export async function runBankrBootstrapAction(input: {
  role?: OpsRole;
}): Promise<BankrBootstrapResult> {
  const effectiveRole = resolveServerRole();
  const readiness = await runBankrReadinessCheckAction(input);

  const startedAt = Date.now();
  let smoke: OpsRunResult;
  if (!readiness.ok) {
    smoke = {
      ok: false,
      commandId: "bankr_smoke",
      role: effectiveRole,
      startedAt,
      endedAt: Date.now(),
      steps: [],
      error: "readiness_failed_skip_smoke",
    };
  } else {
    smoke = await executeCommand({ role: effectiveRole, commandId: "bankr_smoke" });
  }

  const ok = readiness.ok && smoke.ok;
  revalidatePath("/ops/control");
  return {
    ok,
    role: effectiveRole,
    checkedAt: Date.now(),
    steps: { readiness, smoke },
    error: ok
      ? undefined
      : !readiness.ok
      ? "bankr_readiness_check_failed"
      : "bankr_smoke_failed",
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
