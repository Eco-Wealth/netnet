import { headers } from "next/headers";

/**
 * Server-safe base URL builder (works behind reverse proxies).
 * Avoids hardcoding localhost in server components.
 */
export function getServerBaseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1";
}
