import type { ProgramId, ProgramStatus } from "./types";

type FailureRecord = { at: number; reason: string };

const state = new Map<
  ProgramId,
  { pausedUntil?: number; lastAnomaly?: { at: number; reason: string }; failures: FailureRecord[] }
>();

function getOrInit(programId: ProgramId) {
  if (!state.has(programId)) state.set(programId, { failures: [] });
  return state.get(programId)!;
}

export function pauseProgram(programId: ProgramId, seconds: number, reason: string) {
  const s = getOrInit(programId);
  s.pausedUntil = Date.now() + seconds * 1000;
  s.lastAnomaly = { at: Date.now(), reason };
}

export function resumeProgram(programId: ProgramId) {
  const s = getOrInit(programId);
  s.pausedUntil = undefined;
}

export function recordFailure(programId: ProgramId, reason: string) {
  const s = getOrInit(programId);
  s.failures.push({ at: Date.now(), reason });
}

export function pruneFailures(programId: ProgramId, windowSeconds: number) {
  const s = getOrInit(programId);
  const cutoff = Date.now() - windowSeconds * 1000;
  s.failures = s.failures.filter((f) => f.at >= cutoff);
}

export function isPaused(programId: ProgramId): { paused: boolean; pausedUntil?: number } {
  const s = getOrInit(programId);
  if (!s.pausedUntil) return { paused: false };
  if (Date.now() > s.pausedUntil) {
    s.pausedUntil = undefined;
    return { paused: false };
  }
  return { paused: true, pausedUntil: s.pausedUntil };
}

export function getProgramStatus(programId: ProgramId, windowSeconds: number): ProgramStatus {
  const s = getOrInit(programId);
  pruneFailures(programId, windowSeconds);
  const paused = isPaused(programId);
  return {
    programId,
    paused: paused.paused,
    pausedUntil: paused.pausedUntil ? new Date(paused.pausedUntil).toISOString() : undefined,
    lastAnomaly: s.lastAnomaly
      ? { at: new Date(s.lastAnomaly.at).toISOString(), reason: s.lastAnomaly.reason }
      : undefined,
    recentFailures: s.failures.length,
  };
}
