import { getIncentiveBpsConfig } from "@/lib/economics";

export async function readIncentivesConfig() {
  return getIncentiveBpsConfig();
}
