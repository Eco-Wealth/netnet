import { headers } from "next/headers";

/**
 * Server-safe base URL builder (works behind reverse proxies).
 * Avoids hardcoding localhost in server components.
 */
export function getServerBaseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
