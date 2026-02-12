import "server-only";

import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { MessageEnvelope } from "@/lib/operator/model";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";

const PROJECT_PACKAGE_NAME = "netnet-cockpit";

function isCockpitRoot(candidate: string): boolean {
  const pkgPath = path.join(candidate, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      name?: unknown;
    };
    return parsed.name === PROJECT_PACKAGE_NAME;
  } catch {
    return false;
  }
}

function findRootFrom(start: string): string | null {
  let current = path.resolve(start);
  while (true) {
    if (isCockpitRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function resolveCockpitRoot(): string {
  const fromCwd = findRootFrom(process.cwd());
  if (fromCwd) return fromCwd;
  const fromModuleDir = findRootFrom(__dirname);
  if (fromModuleDir) return fromModuleDir;
  return process.cwd();
}

const OPERATOR_DB_PATH = path.join(resolveCockpitRoot(), "data", "operator.db");

type MessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: number;
  metadata: string | null;
};

type ProposalRow = {
  id: string;
  data: string;
};

type ExecutionRow = {
  id: string;
  proposalId: string;
  status: string;
  startedAt: number | null;
  completedAt: number | null;
  result: string | null;
  error: string | null;
};

export type PersistedExecution = {
  id: string;
  proposalId: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  result?: Record<string, unknown>;
  error?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_DB__: Database.Database | undefined;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value || !value.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "null";
  }
}

function ensureOperatorTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      proposalId TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt INTEGER,
      completedAt INTEGER,
      result TEXT,
      error TEXT
    );
  `);
}

function operatorDb(): Database.Database {
  if (globalThis.__NETNET_OPERATOR_DB__) {
    return globalThis.__NETNET_OPERATOR_DB__;
  }

  const dir = path.dirname(OPERATOR_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(OPERATOR_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureOperatorTables(db);
  globalThis.__NETNET_OPERATOR_DB__ = db;
  return db;
}

export function saveMessage(envelope: MessageEnvelope) {
  const db = operatorDb();
  db.prepare(
    `
      INSERT INTO messages (id, role, content, createdAt, metadata)
      VALUES (@id, @role, @content, @createdAt, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        content = excluded.content,
        createdAt = excluded.createdAt,
        metadata = excluded.metadata
    `
  ).run({
    id: envelope.id,
    role: envelope.role,
    content: envelope.content,
    createdAt: envelope.createdAt,
    metadata: envelope.metadata ? safeJsonStringify(envelope.metadata) : null,
  });
}

export function loadMessages(): MessageEnvelope[] {
  const db = operatorDb();
  const rows = db
    .prepare(
      `
      SELECT id, role, content, createdAt, metadata
      FROM messages
      ORDER BY createdAt ASC, id ASC
    `
    )
    .all() as MessageRow[];

  return rows.map((row) => ({
    id: row.id,
    role: row.role as MessageEnvelope["role"],
    content: row.content,
    createdAt: row.createdAt,
    metadata:
      safeJsonParse<MessageEnvelope["metadata"]>(row.metadata) ?? undefined,
  }));
}

export function saveProposal(proposal: SkillProposalEnvelope) {
  const db = operatorDb();
  const now = Date.now();
  db.prepare(
    `
      INSERT INTO proposals (id, data, createdAt, updatedAt)
      VALUES (@id, @data, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updatedAt = excluded.updatedAt
    `
  ).run({
    id: proposal.id,
    data: safeJsonStringify(proposal),
    createdAt: proposal.createdAt,
    updatedAt: now,
  });
}

export function loadProposal(id: string): SkillProposalEnvelope | null {
  const proposalId = String(id || "").trim();
  if (!proposalId) return null;
  const db = operatorDb();
  const row = db
    .prepare(
      `
      SELECT id, data
      FROM proposals
      WHERE id = ?
    `
    )
    .get(proposalId) as ProposalRow | undefined;
  if (!row) return null;
  return safeJsonParse<SkillProposalEnvelope>(row.data);
}

export function saveExecution(input: PersistedExecution) {
  const db = operatorDb();
  db.prepare(
    `
      INSERT INTO executions (id, proposalId, status, startedAt, completedAt, result, error)
      VALUES (@id, @proposalId, @status, @startedAt, @completedAt, @result, @error)
      ON CONFLICT(id) DO UPDATE SET
        proposalId = excluded.proposalId,
        status = excluded.status,
        startedAt = excluded.startedAt,
        completedAt = excluded.completedAt,
        result = excluded.result,
        error = excluded.error
    `
  ).run({
    id: input.id,
    proposalId: input.proposalId,
    status: input.status,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    result:
      input.result && Object.keys(input.result).length > 0
        ? safeJsonStringify(input.result)
        : null,
    error: input.error ?? null,
  });
}

export function loadExecution(id: string): PersistedExecution | null {
  const executionId = String(id || "").trim();
  if (!executionId) return null;
  const db = operatorDb();
  const row = db
    .prepare(
      `
      SELECT id, proposalId, status, startedAt, completedAt, result, error
      FROM executions
      WHERE id = ?
    `
    )
    .get(executionId) as ExecutionRow | undefined;

  if (!row) return null;
  return {
    id: row.id,
    proposalId: row.proposalId,
    status: row.status,
    startedAt: row.startedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    result: safeJsonParse<Record<string, unknown>>(row.result) ?? undefined,
    error: row.error ?? undefined,
  };
}
