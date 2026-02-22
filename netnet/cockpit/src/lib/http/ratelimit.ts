// Best-effort in-memory IP rate limiter (baseline safety).
// NOTE: On serverless platforms, memory may not persist across instances.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitByIp(ip: string, opts?: { windowMs?: number; max?: number }) {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? 60;

  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (b.count >= max) return { ok: false, remaining: 0, resetAt: b.resetAt };

  b.count += 1;
  return { ok: true, remaining: max - b.count, resetAt: b.resetAt };
}
