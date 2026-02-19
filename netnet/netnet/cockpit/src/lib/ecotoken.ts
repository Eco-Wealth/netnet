import { z } from "zod";

export const TxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "tx hash must be a 0x-prefixed 32-byte hex string");

export function buildEcoTokenScanUrl(hash: string) {
  const parsed = TxHashSchema.safeParse(hash);
  if (!parsed.success) return null;
  return `https://scan.ecotoken.earth/tx/${parsed.data.toLowerCase()}`;
}
