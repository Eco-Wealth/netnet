export type FetchJsonResult<T> =
  | { ok: true; status: number; data: T; headers: Headers }
  | { ok: false; status: number; error: unknown; headers: Headers };

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<FetchJsonResult<T>> {
  const { timeoutMs = 12_000, ...rest } = init;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal, cache: "no-store" });
    const headers = res.headers;

    const text = await res.text();
    const isJson = headers.get("content-type")?.includes("application/json");
    const parsed = isJson && text ? JSON.parse(text) : (text as any);

    if (!res.ok) {
      return { ok: false, status: res.status, error: parsed, headers };
    }

    return { ok: true, status: res.status, data: parsed as T, headers };
  } catch (e) {
    return { ok: false, status: 0, error: e, headers: new Headers() };
  } finally {
    clearTimeout(id);
  }
}

export async function httpJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: unknown }
> {
  const res = await fetchJson<unknown>(url, init);
  if (res.ok) return { ok: true, status: res.status, data: res.data };
  return { ok: false, status: res.status, error: res.error };
}
