import { listWorkItems, updateWorkStatus, addWorkEvent } from "../work/workStore";
import fs from "fs";
import path from "path";

const WORKER_STATE_PATH = path.join(process.cwd(), "netnet/cockpit/src/vealth/worker/workerState.json");

async function writeWorkerState(state: { lastRun: string; lastProcessedId: string | null }) {
  const dir = path.dirname(WORKER_STATE_PATH);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = WORKER_STATE_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { encoding: "utf-8" });
    fs.renameSync(tmp, WORKER_STATE_PATH);
  } catch (e) {
    // swallow file write errors to avoid crashing worker
    // but log to console for observability
    // eslint-disable-next-line no-console
    console.error("Failed to write worker state:", e);
  }
}

export async function runWorkerOnce(): Promise<{ processed?: string; skipped?: string[] } | null> {
  const now = new Date().toISOString();
  let processedId: string | null = null;

  // Find NEW items for owner=vealth
  const items = listWorkItems({ owner: "vealth", status: "NEW" as any });
  if (!items || items.length === 0) {
    await writeWorkerState({ lastRun: now, lastProcessedId: null });
    return null;
  }

  const item = items[0];

  // Attempt to lock
  const locked = updateWorkStatus(item.id, "IN_PROGRESS");
  if (!locked) {
    await writeWorkerState({ lastRun: now, lastProcessedId: null });
    return { skipped: [item.id] };
  }

  // Post event: Locked
  addWorkEvent(item.id, { type: "COMMENT", message: "Locked by vealth", actor: "vealth" });

  // Simulate execution (no delay for determinism)
  // In real worker, you'd perform work here

  // Post execution complete
  addWorkEvent(item.id, { type: "COMMENT", message: "Execution complete", actor: "vealth" });

  // Mark DONE
  const done = updateWorkStatus(item.id, "DONE");
  if (done) {
    addWorkEvent(item.id, { type: "COMMENT", message: "Marked DONE", actor: "vealth" });
    processedId = item.id;
    await writeWorkerState({ lastRun: now, lastProcessedId: processedId });
    return { processed: item.id };
  }

  await writeWorkerState({ lastRun: now, lastProcessedId: null });
  return { skipped: [item.id] };
}
