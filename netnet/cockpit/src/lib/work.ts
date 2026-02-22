import {
  loadWorkItemRecord,
  loadWorkItemRecords,
  saveWorkItemRecord,
} from "@/lib/operator/db";

export type WorkStatus = "NEW" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

export type WorkPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type WorkEventType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "COMMENT"
  | "APPROVAL_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED"
  | "PROOF_ATTACHED";

export type WorkEvent = {
  id: string;
  type: WorkEventType;
  at: string; // ISO
  by: string; // actor id (operator/agent)
  note?: string;
  patch?: Record<string, unknown>;
};

export type WorkItem = {
  id: string;
  title: string;
  description?: string;

  owner?: string; // human or agent handle
  tags?: string[];
  priority: WorkPriority;

  status: WorkStatus;

  // Simple SLA + escalation metadata
  createdAt: string; // ISO
  updatedAt: string; // ISO
  slaHours?: number;
  dueAt?: string; // ISO, optional explicit due

  acceptanceCriteria?: string;
  escalationPolicy?: string;

  // audit trail
  events: WorkEvent[];
};

export type WorkCreateInput = {
  title: string;
  description?: string;
  owner?: string;
  tags?: string[];
  priority?: WorkPriority;
  slaHours?: number;
  dueAt?: string;
  acceptanceCriteria?: string;
  escalationPolicy?: string;
  actor?: string; // who is creating
};

export type WorkUpdateInput = Partial<Omit<WorkItem, "id" | "createdAt" | "events">> & {
  actor?: string;
  note?: string;
};

const WORK_STATUSES: WorkStatus[] = ["NEW", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELED"];
const WORK_PRIORITIES: WorkPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const WORK_EVENT_TYPES: WorkEventType[] = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "COMMENT",
  "APPROVAL_REQUESTED",
  "APPROVED",
  "REJECTED",
  "ESCALATED",
  "PROOF_ATTACHED",
];

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

type Store = {
  hydrated: boolean;
  items: Map<string, WorkItem>;
};

function getStore(): Store {
  const g = globalThis as unknown as { __netnetWorkStore?: Store };
  if (!g.__netnetWorkStore) g.__netnetWorkStore = { hydrated: false, items: new Map() };
  return g.__netnetWorkStore;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown, max = 20): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
  return out.length ? out : undefined;
}

function isWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === "string" && WORK_STATUSES.includes(value as WorkStatus);
}

function isWorkPriority(value: unknown): value is WorkPriority {
  return typeof value === "string" && WORK_PRIORITIES.includes(value as WorkPriority);
}

function isWorkEventType(value: unknown): value is WorkEventType {
  return typeof value === "string" && WORK_EVENT_TYPES.includes(value as WorkEventType);
}

function coerceWorkEvent(value: unknown, index: number): WorkEvent {
  const record = toRecord(value);
  const type = isWorkEventType(record.type) ? record.type : "UPDATED";
  const at = readString(record.at) || nowIso();
  const by = readString(record.by) || "operator";
  const patchValue =
    record.patch && typeof record.patch === "object" && !Array.isArray(record.patch)
      ? (record.patch as Record<string, unknown>)
      : undefined;

  return {
    id: readString(record.id) || uid(`evt-${index}`),
    type,
    at,
    by,
    note: readString(record.note) || undefined,
    patch: patchValue,
  };
}

function coerceWorkItem(value: unknown): WorkItem | null {
  const record = toRecord(value);
  const id = readString(record.id);
  const title = readString(record.title);
  if (!id || !title) return null;

  const createdAt = readString(record.createdAt) || nowIso();
  const updatedAt = readString(record.updatedAt) || createdAt;
  const status = isWorkStatus(record.status) ? record.status : "NEW";
  const priority = isWorkPriority(record.priority) ? record.priority : "MEDIUM";
  const eventsRaw = Array.isArray(record.events) ? record.events : [];

  return {
    id,
    title,
    description: readString(record.description) || undefined,
    owner: readString(record.owner) || undefined,
    tags: readStringArray(record.tags),
    priority,
    status,
    createdAt,
    updatedAt,
    slaHours: typeof record.slaHours === "number" ? record.slaHours : undefined,
    dueAt: readString(record.dueAt) || undefined,
    acceptanceCriteria: readString(record.acceptanceCriteria) || undefined,
    escalationPolicy: readString(record.escalationPolicy) || undefined,
    events: eventsRaw.map((event, index) => coerceWorkEvent(event, index)),
  };
}

function persistWorkItem(item: WorkItem) {
  saveWorkItemRecord({
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    data: item as unknown as Record<string, unknown>,
  });
}

function ensureHydrated() {
  const store = getStore();
  if (store.hydrated) return store;
  store.hydrated = true;
  try {
    const records = loadWorkItemRecords();
    for (const record of records) {
      const item = coerceWorkItem(record.data);
      if (!item) continue;
      store.items.set(item.id, item);
    }
  } catch {
    // Keep in-memory store usable even if persistence is unavailable.
  }
  return store;
}

export function listWork(): WorkItem[] {
  const store = ensureHydrated();
  return Array.from(store.items.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWork(id: string): WorkItem | null {
  const workId = readString(id);
  if (!workId) return null;
  const store = ensureHydrated();
  const fromMemory = store.items.get(workId);
  if (fromMemory) return fromMemory;

  try {
    const record = loadWorkItemRecord(workId);
    const item = record ? coerceWorkItem(record.data) : null;
    if (!item) return null;
    store.items.set(item.id, item);
    return item;
  } catch {
    return null;
  }
}

export function createWork(input: WorkCreateInput): WorkItem {
  const store = ensureHydrated();
  const id = uid("work");
  const at = nowIso();
  const actor = input.actor || "operator";

  const item: WorkItem = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    owner: input.owner?.trim() || undefined,
    tags: input.tags?.filter(Boolean).map((t) => t.trim()).slice(0, 20),
    priority: input.priority || "MEDIUM",
    status: "NEW",
    createdAt: at,
    updatedAt: at,
    slaHours: input.slaHours,
    dueAt: input.dueAt,
    acceptanceCriteria: input.acceptanceCriteria?.trim() || undefined,
    escalationPolicy: input.escalationPolicy?.trim() || undefined,
    events: [
      {
        id: uid("evt"),
        type: "CREATED",
        at,
        by: actor,
        note: "created",
        patch: { title: input.title, priority: input.priority || "MEDIUM" },
      },
    ],
  };

  store.items.set(id, item);
  persistWorkItem(item);
  return item;
}

export function updateWork(id: string, patch: WorkUpdateInput): WorkItem | null {
  const store = ensureHydrated();
  const workId = readString(id);
  if (!workId) return null;
  const cur = store.items.get(workId);
  if (!cur) return null;

  const at = nowIso();
  const actor = readString(patch.actor) || "operator";
  const note = readString(patch.note) || undefined;
  const updateFields: Partial<WorkItem> = {};

  if (typeof patch.title === "string") updateFields.title = patch.title.trim() || cur.title;
  if (typeof patch.description === "string") {
    updateFields.description = patch.description.trim() || undefined;
  }
  if (typeof patch.owner === "string") updateFields.owner = patch.owner.trim() || undefined;
  if (isWorkPriority(patch.priority)) updateFields.priority = patch.priority;
  if (isWorkStatus(patch.status)) updateFields.status = patch.status;
  if (typeof patch.slaHours === "number") updateFields.slaHours = patch.slaHours;
  if (typeof patch.dueAt === "string") updateFields.dueAt = patch.dueAt.trim() || undefined;
  if (typeof patch.acceptanceCriteria === "string") {
    updateFields.acceptanceCriteria = patch.acceptanceCriteria.trim() || undefined;
  }
  if (typeof patch.escalationPolicy === "string") {
    updateFields.escalationPolicy = patch.escalationPolicy.trim() || undefined;
  }
  if (Array.isArray(patch.tags)) {
    updateFields.tags = patch.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  const next: WorkItem = {
    ...cur,
    ...updateFields,
    id: cur.id,
    createdAt: cur.createdAt,
    updatedAt: at,
    events: [
      ...cur.events,
      {
        id: uid("evt"),
        type:
          updateFields.status && updateFields.status !== cur.status
            ? "STATUS_CHANGED"
            : "UPDATED",
        at,
        by: actor,
        note,
        patch: Object.fromEntries(
          Object.entries(updateFields).filter(([, value]) => value !== undefined)
        ),
      },
    ],
  };

  store.items.set(workId, next);
  persistWorkItem(next);
  return next;
}

export function appendWorkEvent(
  id: string,
  event: Omit<WorkEvent, "id" | "at">
): WorkItem | null {
  const store = ensureHydrated();
  const workId = readString(id);
  if (!workId) return null;
  const cur = store.items.get(workId);
  if (!cur) return null;

  const at = nowIso();
  const normalizedType = isWorkEventType(event.type) ? event.type : "COMMENT";
  const next: WorkItem = {
    ...cur,
    updatedAt: at,
    events: [
      ...cur.events,
      {
        ...event,
        type: normalizedType,
        id: uid("evt"),
        at,
        by: readString(event.by) || "operator",
      },
    ],
  };

  store.items.set(workId, next);
  persistWorkItem(next);
  return next;
}
