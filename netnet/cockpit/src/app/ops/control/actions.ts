"use server";

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getOpsCommandById, type OpsCommandSpec, type OpsRole } from "./commands";

const COCKPIT_ROOT = process.cwd();
const REPO_ROOT = path.resolve(COCKPIT_ROOT, "..", "..");
const AI_EYES_DIR = path.join(COCKPIT_ROOT, "test-results", "ai-eyes");
const OUTPUT_LIMIT = 8000;
const STEP_TIMEOUT_MS = 12 * 60 * 1000;

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

export type AIEyesArtifacts = {
  ok: boolean;
  updatedAt?: number;
  reportJson?: string;
  reportMarkdown?: string;
  screenshots: string[];
  error?: string;
};

type RunInput = {
  commandId: string;
  role: OpsRole;
};

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
  const command = getOpsCommandById(input.commandId);

  if (!command) {
    return {
      ok: false,
      commandId: input.commandId,
      role: input.role,
      startedAt,
      endedAt: Date.now(),
      steps: [],
      error: "command_not_found",
    };
  }

  if (!hasAccess(input.role, command)) {
    return {
      ok: false,
      commandId: input.commandId,
      role: input.role,
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
        role: input.role,
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
    role: input.role,
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
  role: OpsRole;
  commandIds: string[];
}): Promise<OpsSequenceResult> {
  const startedAt = Date.now();
  const runs: OpsRunResult[] = [];

  for (const commandId of input.commandIds) {
    const run = await executeCommand({ role: input.role, commandId });
    runs.push(run);
    if (!run.ok) {
      revalidatePath("/ops/control");
      return {
        ok: false,
        role: input.role,
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
    role: input.role,
    commandIds: input.commandIds,
    startedAt,
    endedAt: Date.now(),
    runs,
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

