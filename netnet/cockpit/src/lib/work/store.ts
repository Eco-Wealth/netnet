export type WorkStatus = "PROPOSED" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";

export type WorkEvent = {
  at: string; // ISO
  type: string;
  by?: string;
  note?: string;
  patch?: any;
};

export type WorkItem = {
  id: string;
  title: string;
  description?: string;
  status: WorkStatus;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  tags?: string[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
  events: WorkEvent[];
};

const store = new Map<string, WorkItem>();

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  // good-enough local id for in-memory store
  return "w_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

export function listWorkItems(): WorkItem[] {
  return Array.from(store.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWorkItem(id: string): WorkItem | null {
  return store.get(id) ?? null;
}

export function createWorkItem(input: {
  title: string;
  description?: string;
  tags?: string[];
  priority?: "LOW" | "MEDIUM" | "HIGH";
  owner?: string;
  status?: WorkStatus;
}): WorkItem {
  const t = nowIso();
  const item: WorkItem = {
    id: makeId(),
    title: input.title,
    description: input.description,
    status: input.status ?? "PROPOSED",
    priority: input.priority ?? "MEDIUM",
    tags: input.tags ?? [],
    owner: input.owner,
    createdAt: t,
    updatedAt: t,
    events: [],
  };

  store.set(item.id, item);
  return item;
}

export function updateWorkItem(
  id: string,
  patch: Partial<Pick<WorkItem, "title" | "description" | "status" | "priority" | "tags" | "owner">>
): WorkItem | null {
  const cur = store.get(id);
  if (!cur) return null;
  const next: WorkItem = {
    ...cur,
    ...patch,
    updatedAt: nowIso(),
  };
  store.set(id, next);
  return next;
}

export function appendWorkEvent(
  id: string,
  ev: Omit<WorkEvent, "at"> & { at?: string }
): WorkItem | null {
  const cur = store.get(id);
  if (!cur) return null;

  const event: WorkEvent = {
    at: ev.at ?? nowIso(),
    type: ev.type,
    by: ev.by,
    note: ev.note,
    patch: ev.patch,
  };

  const next: WorkItem = {
    ...cur,
    events: [...cur.events, event],
    updatedAt: nowIso(),
  };

  store.set(id, next);
  return next;
}
