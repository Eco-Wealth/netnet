export type WalletVenue = "kumbaya" | "zora" | "bankr";

export type OperatorWalletProfile = {
  id: string;
  label: string;
  walletAddress: string;
  chain: string;
  venue: WalletVenue;
  privyWalletId?: string;
  chainCaip2?: string;
  allowedActions: string[];
  notes?: string;
};

const DEFAULT_WALLET_PROFILES: OperatorWalletProfile[] = [
  {
    id: "vealth-kumbaya",
    label: "VEALTH Ops",
    walletAddress: process.env.PRIVY_WALLET_VEALTH || "",
    chain: "megaeth",
    venue: "kumbaya",
    privyWalletId: process.env.PRIVY_WALLET_ID_VEALTH || "",
    chainCaip2: process.env.PRIVY_CHAIN_CAIP2_VEALTH || "",
    allowedActions: [
      "bankr.wallet.read",
      "bankr.token.info",
      "bankr.token.actions",
      "bankr.launch",
      "bankr.plan",
      "bankr.quote",
      "bankr.token.read",
      "bankr.token.actions.plan",
      "token.manage",
      "token.launch",
    ],
    notes: "Primary wallet for VELATH token operations on MegaETH/Kumbaya.",
  },
  {
    id: "ecowealth-zora",
    label: "EcoWealth Ops",
    walletAddress: process.env.PRIVY_WALLET_ECOWEALTH || "",
    chain: "zora",
    venue: "zora",
    privyWalletId: process.env.PRIVY_WALLET_ID_ECOWEALTH || "",
    chainCaip2: process.env.PRIVY_CHAIN_CAIP2_ECOWEALTH || "",
    allowedActions: [
      "bankr.wallet.read",
      "bankr.token.info",
      "bankr.token.actions",
      "bankr.plan",
      "bankr.quote",
      "bankr.token.read",
      "bankr.token.actions.plan",
      "token.manage",
    ],
    notes: "EcoWealth operations lane. Launch/write actions remain restricted by default.",
  },
];

export function listDefaultWalletProfiles(): OperatorWalletProfile[] {
  return DEFAULT_WALLET_PROFILES.map((profile) => ({ ...profile }));
}

export function getWalletProfileById(
  profileId: string
): OperatorWalletProfile | null {
  const normalizedId = normalizeWalletProfileId(profileId);
  if (!normalizedId) return null;
  const found = DEFAULT_WALLET_PROFILES.find((profile) => profile.id === normalizedId);
  return found ? { ...found } : null;
}

export function normalizeWalletProfileId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function isActionAllowedForProfile(
  profile: OperatorWalletProfile,
  action: string
): boolean {
  return profile.allowedActions.includes(action);
}
