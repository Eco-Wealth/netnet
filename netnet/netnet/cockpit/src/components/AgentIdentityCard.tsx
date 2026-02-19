"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentIdentity, defaultIdentity, loadAgentIdentity, saveAgentIdentity } from "@/lib/agentIdentity";

function isLikelyEvmAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v.trim());
}

export default function AgentIdentityCard(props: { onChange?: (identity: AgentIdentity) => void }) {
  const [identity, setIdentity] = useState<AgentIdentity>(defaultIdentity);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const loaded = loadAgentIdentity();
    setIdentity(loaded);
    props.onChange?.(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!touched) return;
    saveAgentIdentity(identity);
    props.onChange?.(identity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, touched]);

  const walletOk = useMemo(() => {
    if (!identity.wallet.trim()) return true; // optional
    return isLikelyEvmAddress(identity.wallet);
  }, [identity.wallet]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Agent Identity</h2>
        <span className="text-xs text-white/60">local only</span>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-white/70">Display name</span>
          <input
            value={identity.displayName}
            onChange={(e) => {
              setTouched(true);
              setIdentity((s) => ({ ...s, displayName: e.target.value }));
            }}
            placeholder="e.g. Netnet Operator"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-white/70">Agent wallet (Base)</span>
          <input
            value={identity.wallet}
            onChange={(e) => {
              setTouched(true);
              setIdentity((s) => ({ ...s, wallet: e.target.value }));
            }}
            placeholder="0x..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          {!walletOk && <span className="text-xs text-red-300">Wallet must be a 0x… EVM address.</span>}
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-white/70">ERC-8004 / profile URL (optional)</span>
          <input
            value={identity.profileUrl}
            onChange={(e) => {
              setTouched(true);
              setIdentity((s) => ({ ...s, profileUrl: e.target.value }));
            }}
            placeholder="https://..."
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
        </label>

        <div className="text-xs text-white/60">
          Stored in browser localStorage. Included in new proof objects you generate from this browser session.
        </div>
      </div>
    </div>
  );
}
