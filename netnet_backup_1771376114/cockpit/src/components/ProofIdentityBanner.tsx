"use client";

import { useEffect, useState } from "react";
import { AgentIdentity, loadAgentIdentity } from "@/lib/agentIdentity";
import Link from "next/link";

export default function ProofIdentityBanner() {
  const [id, setId] = useState<AgentIdentity | null>(null);

  useEffect(() => {
    setId(loadAgentIdentity());
  }, []);

  const name = id?.displayName?.trim();
  const wallet = id?.wallet?.trim();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Identity for proof objects</div>
          <div className="mt-1 text-xs text-white/70">
            {name || wallet ? (
              <>
                {name ? <span className="mr-2">{name}</span> : null}
                {wallet ? <span className="font-mono">{wallet}</span> : null}
              </>
            ) : (
              <>Not set yet</>
            )}
          </div>
        </div>
        <Link href="/identity" className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs hover:border-white/30">
          Edit
        </Link>
      </div>
    </div>
  );
}
