export function isTxHash(v: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(v);
}
