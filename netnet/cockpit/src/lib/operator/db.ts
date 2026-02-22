import "server-only";

import fs from "fs";
import path from "path";
import type { MessageEnvelope } from "@/lib/operator/model";
import type { SkillProposalEnvelope } from "@/lib/operator/proposal";
import type { Strategy } from "@/lib/operator/strategy";

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

// In production, mount /app/data as persistent volume.
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

type StrategyRow = {
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

type PnlEventRow = {
  id: string;
  executionId: string;
  proposalId: string;
  skillId: string | null;
  action: string | null;
  kind: string;
  amountUsd: number;
  createdAt: number;
};

type PnlSummaryRow = {
  count: number;
  usdIn: number | null;
  usdOut: number | null;
};

type ProofRecordRow = {
  id: string;
  schema: string;
  kind: string;
  hash: string;
  createdAt: number;
  payload: string;
  metadata: string | null;
};

type WorkItemRow = {
  id: string;
  data: string;
  createdAt: number;
  updatedAt: number;
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

export type PnlEvent = {
  id: string;
  executionId: string;
  proposalId: string;
  skillId?: string;
  action?: string;
  kind: "usd_in" | "usd_out";
  amountUsd: number;
  createdAt: number;
};

export type PnlSummary = {
  sinceMs: number;
  count: number;
  usdIn: number;
  usdOut: number;
  net: number;
};

export type ProofRecord = {
  id: string;
  schema: string;
  kind: string;
  hash: string;
  createdAt: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type SaveProofRecordInput = {
  id: string;
  schema: string;
  kind: string;
  hash: string;
  createdAt: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type WorkItemRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
};

type DbStatement = {
  run: (params?: Record<string, unknown>) => unknown;
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
};

type OperatorDatabase = {
  exec: (sql: string) => void;
  pragma: (sql: string) => void;
  prepare: (sql: string) => DbStatement;
};

function loadSqliteModule():
  | (new (path: string) => OperatorDatabase)
  | null {
  try {
    const localRequire = new Function(
      "return typeof require === 'function' ? require : null;"
    )() as ((id: string) => unknown) | null;
    if (!localRequire) return null;
    const loaded = localRequire("better-sqlite3") as unknown;
    if (typeof loaded !== "function") return null;
    return loaded as new (path: string) => OperatorDatabase;
  } catch {
    return null;
  }
}

function fallbackEventsStore(): PnlEvent[] {
  if (!globalThis.__NETNET_PNL_EVENTS_FALLBACK__) {
    globalThis.__NETNET_PNL_EVENTS_FALLBACK__ = [];
  }
  return globalThis.__NETNET_PNL_EVENTS_FALLBACK__;
}

function fallbackStrategiesStore(): Strategy[] {
  if (!globalThis.__NETNET_STRATEGIES_FALLBACK__) {
    globalThis.__NETNET_STRATEGIES_FALLBACK__ = [];
  }
  return globalThis.__NETNET_STRATEGIES_FALLBACK__;
}

function fallbackProofStore(): ProofRecord[] {
  if (!globalThis.__NETNET_PROOF_RECORDS_FALLBACK__) {
    globalThis.__NETNET_PROOF_RECORDS_FALLBACK__ = [];
  }
  return globalThis.__NETNET_PROOF_RECORDS_FALLBACK__;
}

function fallbackWorkItemsStore(): WorkItemRecord[] {
  if (!globalThis.__NETNET_WORK_ITEMS_FALLBACK__) {
    globalThis.__NETNET_WORK_ITEMS_FALLBACK__ = [];
  }
  return globalThis.__NETNET_WORK_ITEMS_FALLBACK__;
}

declare global {
  // eslint-disable-next-line no-var
  var __NETNET_OPERATOR_DB__: OperatorDatabase | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_PNL_EVENTS_FALLBACK__: PnlEvent[] | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_STRATEGIES_FALLBACK__: Strategy[] | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_PROOF_RECORDS_FALLBACK__: ProofRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __NETNET_WORK_ITEMS_FALLBACK__: WorkItemRecord[] | undefined;
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

function toEpochMs(value: string, fallback: number): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  return fallback;
}

function ensureOperatorTables(db: OperatorDatabase) {
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

    CREATE TABLE IF NOT EXISTS strategies (
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

    CREATE TABLE IF NOT EXISTS pnl_events (
      id TEXT PRIMARY KEY,
      executionId TEXT NOT NULL,
      proposalId TEXT NOT NULL,
      skillId TEXT,
      action TEXT,
      kind TEXT NOT NULL,
      amountUsd REAL NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proof_records (
      id TEXT PRIMARY KEY,
      schema TEXT NOT NULL,
      kind TEXT NOT NULL,
      hash TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      payload TEXT NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);
}

function operatorDb(): OperatorDatabase {
  if (globalThis.__NETNET_OPERATOR_DB__) {
    return globalThis.__NETNET_OPERATOR_DB__;
  }

  const SqliteDatabase = loadSqliteModule();
  if (!SqliteDatabase) {
    throw new Error("better-sqlite3_not_available");
  }

  const dir = path.dirname(OPERATOR_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new SqliteDatabase(OPERATOR_DB_PATH);
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

export function saveStrategy(strategy: Strategy) {
  try {
    const db = operatorDb();
    const now = Date.now();
    db.prepare(
      `
      INSERT INTO strategies (id, data, createdAt, updatedAt)
      VALUES (@id, @data, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updatedAt = excluded.updatedAt
    `
    ).run({
      id: strategy.id,
      data: safeJsonStringify(strategy),
      createdAt: strategy.createdAt,
      updatedAt: typeof strategy.updatedAt === "number" ? strategy.updatedAt : now,
    });
    return;
  } catch {
    const rows = fallbackStrategiesStore();
    const existing = rows.findIndex((row) => row.id === strategy.id);
    const next = { ...strategy };
    if (existing >= 0) rows[existing] = next;
    else rows.push(next);
  }
}

export function loadStrategies(): Strategy[] {
  try {
    const db = operatorDb();
    const rows = db
      .prepare(
        `
      SELECT id, data
      FROM strategies
      ORDER BY updatedAt DESC, id DESC
    `
      )
      .all() as StrategyRow[];

    const parsed: Strategy[] = [];
    for (const row of rows) {
      const value = safeJsonParse<Strategy>(row.data);
      if (value && typeof value.id === "string") parsed.push(value);
    }
    return parsed;
  } catch {
    return [...fallbackStrategiesStore()].sort(
      (a, b) => b.updatedAt - a.updatedAt || b.id.localeCompare(a.id)
    );
  }
}

export function saveWorkItemRecord(record: WorkItemRecord) {
  const now = Date.now();
  const normalized: WorkItemRecord = {
    id: String(record.id || "").trim(),
    createdAt: String(record.createdAt || "").trim() || new Date(now).toISOString(),
    updatedAt: String(record.updatedAt || "").trim() || new Date(now).toISOString(),
    data:
      record.data && typeof record.data === "object" && !Array.isArray(record.data)
        ? record.data
        : {},
  };
  if (!normalized.id) return;

  const createdAt = toEpochMs(normalized.createdAt, now);
  const updatedAt = toEpochMs(normalized.updatedAt, createdAt);

  try {
    const db = operatorDb();
    db.prepare(
      `
      INSERT INTO work_items (id, data, createdAt, updatedAt)
      VALUES (@id, @data, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `
    ).run({
      id: normalized.id,
      data: safeJsonStringify(normalized.data),
      createdAt,
      updatedAt,
    });
    return;
  } catch {
    const rows = fallbackWorkItemsStore();
    const next: WorkItemRecord = {
      ...normalized,
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
    };
    const existing = rows.findIndex((row) => row.id === normalized.id);
    if (existing >= 0) rows[existing] = next;
    else rows.push(next);
  }
}

export function loadWorkItemRecord(id: string): WorkItemRecord | null {
  const workId = String(id || "").trim();
  if (!workId) return null;
  try {
    const db = operatorDb();
    const row = db
      .prepare(
        `
      SELECT id, data, createdAt, updatedAt
      FROM work_items
      WHERE id = ?
    `
      )
      .get(workId) as WorkItemRow | undefined;
    if (!row) return null;
    const parsed = safeJsonParse<Record<string, unknown>>(row.data);
    if (!parsed) return null;
    return {
      id: row.id,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      data: parsed,
    };
  } catch {
    const row = fallbackWorkItemsStore().find((item) => item.id === workId);
    return row ? { ...row, data: { ...row.data } } : null;
  }
}

export function loadWorkItemRecords(): WorkItemRecord[] {
  try {
    const db = operatorDb();
    const rows = db
      .prepare(
        `
      SELECT id, data, createdAt, updatedAt
      FROM work_items
      ORDER BY updatedAt DESC, id DESC
    `
      )
      .all() as WorkItemRow[];

    const out: WorkItemRecord[] = [];
    for (const row of rows) {
      const parsed = safeJsonParse<Record<string, unknown>>(row.data);
      if (!parsed) continue;
      out.push({
        id: row.id,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        data: parsed,
      });
    }
    return out;
  } catch {
    return [...fallbackWorkItemsStore()]
      .sort((a, b) => {
        const aTs = Date.parse(a.updatedAt);
        const bTs = Date.parse(b.updatedAt);
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
          return bTs - aTs;
        }
        return b.id.localeCompare(a.id);
      })
      .map((row) => ({ ...row, data: { ...row.data } }));
  }
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

export function insertPnlEvent(event: PnlEvent) {
  try {
    const db = operatorDb();
    db.prepare(
      `
      INSERT INTO pnl_events (
        id,
        executionId,
        proposalId,
        skillId,
        action,
        kind,
        amountUsd,
        createdAt
      )
      VALUES (
        @id,
        @executionId,
        @proposalId,
        @skillId,
        @action,
        @kind,
        @amountUsd,
        @createdAt
      )
      ON CONFLICT(id) DO UPDATE SET
        executionId = excluded.executionId,
        proposalId = excluded.proposalId,
        skillId = excluded.skillId,
        action = excluded.action,
        kind = excluded.kind,
        amountUsd = excluded.amountUsd,
        createdAt = excluded.createdAt
    `
    ).run({
      id: event.id,
      executionId: event.executionId,
      proposalId: event.proposalId,
      skillId: event.skillId ?? null,
      action: event.action ?? null,
      kind: event.kind,
      amountUsd: event.amountUsd,
      createdAt: event.createdAt,
    });
    return;
  } catch {
    const rows = fallbackEventsStore();
    const existing = rows.findIndex((row) => row.id === event.id);
    if (existing >= 0) rows[existing] = { ...event };
    else rows.push({ ...event });
  }
}

export function listPnlEvents(input: { sinceMs?: number } = {}): PnlEvent[] {
  const sinceMs =
    typeof input.sinceMs === "number" && Number.isFinite(input.sinceMs)
      ? input.sinceMs
      : undefined;
  try {
    const db = operatorDb();
    const rows = (sinceMs
      ? db
          .prepare(
            `
          SELECT id, executionId, proposalId, skillId, action, kind, amountUsd, createdAt
          FROM pnl_events
          WHERE createdAt >= ?
          ORDER BY createdAt DESC, id DESC
        `
          )
          .all(sinceMs)
      : db
          .prepare(
            `
          SELECT id, executionId, proposalId, skillId, action, kind, amountUsd, createdAt
          FROM pnl_events
          ORDER BY createdAt DESC, id DESC
        `
          )
          .all()) as PnlEventRow[];

    return rows.map((row) => ({
      id: row.id,
      executionId: row.executionId,
      proposalId: row.proposalId,
      skillId: row.skillId ?? undefined,
      action: row.action ?? undefined,
      kind: row.kind === "usd_in" ? "usd_in" : "usd_out",
      amountUsd: row.amountUsd,
      createdAt: row.createdAt,
    }));
  } catch {
    const rows = [...fallbackEventsStore()].sort(
      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)
    );
    if (typeof sinceMs !== "number") return rows;
    return rows.filter((row) => row.createdAt >= sinceMs);
  }
}

export function getPnlSummary(input: { sinceMs: number }): PnlSummary {
  const sinceMs =
    typeof input.sinceMs === "number" && Number.isFinite(input.sinceMs)
      ? input.sinceMs
      : 0;
  try {
    const db = operatorDb();
    const row = db
      .prepare(
        `
      SELECT
        COUNT(*) as count,
        SUM(CASE WHEN kind = 'usd_in' THEN amountUsd ELSE 0 END) as usdIn,
        SUM(CASE WHEN kind = 'usd_out' THEN amountUsd ELSE 0 END) as usdOut
      FROM pnl_events
      WHERE createdAt >= ?
    `
      )
      .get(sinceMs) as PnlSummaryRow | undefined;

    const usdIn = Number(row?.usdIn ?? 0);
    const usdOut = Number(row?.usdOut ?? 0);
    const count = Number(row?.count ?? 0);

    return {
      sinceMs,
      count: Number.isFinite(count) ? count : 0,
      usdIn: Number.isFinite(usdIn) ? usdIn : 0,
      usdOut: Number.isFinite(usdOut) ? usdOut : 0,
      net:
        (Number.isFinite(usdIn) ? usdIn : 0) -
        (Number.isFinite(usdOut) ? usdOut : 0),
    };
  } catch {
    const events = listPnlEvents({ sinceMs });
    const summary = events.reduce(
      (acc, event) => {
        acc.count += 1;
        if (event.kind === "usd_in") acc.usdIn += event.amountUsd;
        if (event.kind === "usd_out") acc.usdOut += event.amountUsd;
        return acc;
      },
      { count: 0, usdIn: 0, usdOut: 0 }
    );
    return {
      sinceMs,
      count: summary.count,
      usdIn: summary.usdIn,
      usdOut: summary.usdOut,
      net: summary.usdIn - summary.usdOut,
    };
  }
}

export function saveProofRecord(input: SaveProofRecordInput) {
  try {
    const db = operatorDb();
    db.prepare(
      `
      INSERT INTO proof_records (id, schema, kind, hash, createdAt, payload, metadata)
      VALUES (@id, @schema, @kind, @hash, @createdAt, @payload, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        schema = excluded.schema,
        kind = excluded.kind,
        hash = excluded.hash,
        createdAt = excluded.createdAt,
        payload = excluded.payload,
        metadata = excluded.metadata
    `
    ).run({
      id: input.id,
      schema: input.schema,
      kind: input.kind,
      hash: input.hash,
      createdAt: input.createdAt,
      payload: safeJsonStringify(input.payload),
      metadata: input.metadata ? safeJsonStringify(input.metadata) : null,
    });
    return;
  } catch {
    const rows = fallbackProofStore();
    const next: ProofRecord = {
      id: input.id,
      schema: input.schema,
      kind: input.kind,
      hash: input.hash,
      createdAt: input.createdAt,
      payload: input.payload,
      metadata: input.metadata,
    };
    const existing = rows.findIndex((row) => row.id === input.id);
    if (existing >= 0) rows[existing] = next;
    else rows.push(next);
  }
}

export function loadProofRecord(id: string): ProofRecord | null {
  const proofId = String(id || "").trim();
  if (!proofId) return null;
  try {
    const db = operatorDb();
    const row = db
      .prepare(
        `
      SELECT id, schema, kind, hash, createdAt, payload, metadata
      FROM proof_records
      WHERE id = ?
    `
      )
      .get(proofId) as ProofRecordRow | undefined;
    if (!row) return null;
    const payload = safeJsonParse<Record<string, unknown>>(row.payload);
    if (!payload) return null;
    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata ?? null);
    return {
      id: row.id,
      schema: row.schema,
      kind: row.kind,
      hash: row.hash,
      createdAt: row.createdAt,
      payload,
      metadata: metadata ?? undefined,
    };
  } catch {
    const row = fallbackProofStore().find((record) => record.id === proofId);
    return row ? { ...row } : null;
  }
}

export function listProofRecords(input: { limit?: number } = {}): ProofRecord[] {
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.max(1, Math.floor(input.limit))
      : 50;
  try {
    const db = operatorDb();
    const rows = db
      .prepare(
        `
      SELECT id, schema, kind, hash, createdAt, payload, metadata
      FROM proof_records
      ORDER BY createdAt DESC, id DESC
      LIMIT ?
    `
      )
      .all(limit) as ProofRecordRow[];

    const out: ProofRecord[] = [];
    for (const row of rows) {
      const payload = safeJsonParse<Record<string, unknown>>(row.payload);
      if (!payload) continue;
      const metadata = safeJsonParse<Record<string, unknown>>(row.metadata ?? null);
      out.push({
        id: row.id,
        schema: row.schema,
        kind: row.kind,
        hash: row.hash,
        createdAt: row.createdAt,
        payload,
        metadata: metadata ?? undefined,
      });
    }
    return out;
  } catch {
    return [...fallbackProofStore()]
      .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
      .slice(0, limit);
  }
}
