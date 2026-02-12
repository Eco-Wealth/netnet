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
  | "ESCALATED";

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

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

type Store = {
  items: Map<string, WorkItem>;
};

function getStore(): Store {
  const g = globalThis as unknown as { __netnetWorkStore?: Store };
  if (!g.__netnetWorkStore) g.__netnetWorkStore = { items: new Map() };
  return g.__netnetWorkStore;
}

export function listWork(): WorkItem[] {
  const store = getStore();
  return Array.from(store.items.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWork(id: string): WorkItem | null {
  return getStore().items.get(id) ?? null;
}

export function createWork(input: WorkCreateInput): WorkItem {
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

  getStore().items.set(id, item);
  return item;
}

export function updateWork(id: string, patch: WorkUpdateInput): WorkItem | null {
  const store = getStore();
  const cur = store.items.get(id);
  if (!cur) return null;

  const at = nowIso();
  const actor = patch.actor || "operator";

  const next: WorkItem = {
    ...cur,
    ...patch,
    id: cur.id,
    createdAt: cur.createdAt,
    updatedAt: at,
    events: [
      ...cur.events,
      {
        id: uid("evt"),
        type: patch.status && patch.status !== cur.status ? "STATUS_CHANGED" : "UPDATED",
        at,
        by: actor,
        note: patch.note,
        patch: Object.fromEntries(
          Object.entries(patch).filter(([k]) => !["actor", "note"].includes(k))
        ),
      },
    ],
  };

  store.items.set(id, next);
  return next;
}

export function appendWorkEvent(
  id: string,
  event: Omit<WorkEvent, "id" | "at">
): WorkItem | null {
  const store = getStore();
  const cur = store.items.get(id);
  if (!cur) return null;

  const at = nowIso();
  const next: WorkItem = {
    ...cur,
    updatedAt: at,
    events: [...cur.events, { ...event, id: uid("evt"), at }],
  };

  store.items.set(id, next);
  return next;
}
