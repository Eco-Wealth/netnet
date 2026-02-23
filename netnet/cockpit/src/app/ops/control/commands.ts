export type OpsRole = "viewer" | "operator" | "admin";

export type OpsCommandStep = {
  cwd: "repo" | "cockpit";
  args: [string, ...string[]];
};

export type OpsCommandSpec = {
  id: string;
  title: string;
  description: string;
  category: "health" | "build" | "visual" | "git";
  roles: OpsRole[];
  steps: OpsCommandStep[];
};

export const OPS_COMMANDS: OpsCommandSpec[] = [
  {
    id: "repo_status",
    title: "Repo Status",
    description: "Show local branch and changed files.",
    category: "git",
    roles: ["viewer", "operator", "admin"],
    steps: [
      { cwd: "repo", args: ["git", "status", "--short", "--branch"] },
    ],
  },
  {
    id: "health_fast",
    title: "Fast Health Check",
    description: "Run the low-noise repo health script.",
    category: "health",
    roles: ["operator", "admin"],
    steps: [{ cwd: "repo", args: ["npm", "run", "health:fast"] }],
  },
  {
    id: "mcp_connectors",
    title: "MCP Connector Check",
    description: "Validate Regen MCP connector coverage and wiring.",
    category: "health",
    roles: ["operator", "admin"],
    steps: [{ cwd: "repo", args: ["npm", "run", "mcp:check"] }],
  },
  {
    id: "bankr_readiness",
    title: "Bankr Readiness Check",
    description: "Validate Bankr routes, policy gates, and required env lanes.",
    category: "health",
    roles: ["operator", "admin"],
    steps: [{ cwd: "repo", args: ["npm", "run", "bankr:check"] }],
  },
  {
    id: "bankr_smoke",
    title: "Bankr Smoke Suite",
    description: "Run deterministic Bankr integrity + API surface smoke tests.",
    category: "health",
    roles: ["operator", "admin"],
    steps: [{ cwd: "repo", args: ["npm", "run", "health:bankr"] }],
  },
  {
    id: "cockpit_build",
    title: "Cockpit Build",
    description: "Deterministic Next.js production build.",
    category: "build",
    roles: ["operator", "admin"],
    steps: [{ cwd: "cockpit", args: ["npm", "run", "build"] }],
  },
  {
    id: "cockpit_types",
    title: "Cockpit Typecheck",
    description: "TypeScript no-emit check for cockpit.",
    category: "build",
    roles: ["operator", "admin"],
    steps: [{ cwd: "cockpit", args: ["npx", "tsc", "--noEmit"] }],
  },
  {
    id: "ui_eyes",
    title: "AI Eyes Smoke",
    description: "Capture visuals and control clickability report.",
    category: "visual",
    roles: ["operator", "admin"],
    steps: [{ cwd: "cockpit", args: ["npm", "run", "ai:eyes"] }],
  },
];

export const OPS_ROLES: OpsRole[] = ["viewer", "operator", "admin"];

export function getOpsCommandById(id: string): OpsCommandSpec | undefined {
  return OPS_COMMANDS.find((command) => command.id === id);
}
