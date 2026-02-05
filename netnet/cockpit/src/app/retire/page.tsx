"use client";

import React from "react";
import { Button, Card, Input, Muted, Select, Textarea } from "@/components/ui";
import { AgentPitch } from "@/components/AgentPitch";

type Registry = {
  version?: string;
  lastUpdated?: string;
  projects?: Array<any>;
  supportedTokens?: Record<string, any>;
};

type RetirementQuote = {
  projectId: string;
  amount: number;
  token: string;
  chain: string;
  estimatedCredits: number;
  estimatedCost: number;
  pricePerCredit: number;
  expiresAt: string;
  quoteId: string;
};

type RetirementResponse = {
  retirementId: string;
  status: string;
  paymentAddress: string;
  amount: number;
  token: string;
  chain: string;
  projectId: string;
  estimatedCredits: number;
  createdAt: string;
  expiresAt: string;
  deepLink: string;
};

function pickDefaultChain(reg: Registry | null): string {
  const keys = reg?.supportedTokens ? Object.keys(reg.supportedTokens) : [];
  if (keys.includes("base")) return "base";
  if (keys.includes("ethereum")) return "ethereum";
  return keys[0] ?? "ethereum";
}

function tokensForChain(reg: Registry | null, chain: string): Array<any> {
  if (!reg?.supportedTokens) return [];
  const x = (reg.supportedTokens as any)[chain];
  return Array.isArray(x) ? x : [];
}

export default function RetirePage() {
  const [registry, setRegistry] = React.useState<Registry | null>(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<any | null>(null);

  const [chain, setChain] = React.useState("base");
  const [token, setToken] = React.useState("USDC");
  const [amount, setAmount] = React.useState("25");
  
  // New retirement flow state
  const [beneficiaryName, setBeneficiaryName] = React.useState("");
  const [retirementReason, setRetirementReason] = React.useState("Carbon offset via netnet-cockpit");
  const [quote, setQuote] = React.useState<RetirementQuote | null>(null);
  const [retirement, setRetirement] = React.useState<RetirementResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [retireLoading, setRetireLoading] = React.useState(false);

  const [txHash, setTxHash] = React.useState("");
  const [txStatus, setTxStatus] = React.useState<any | null>(null);
  const [scanInfo, setScanInfo] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string>("");
  
  // Scroll ref for agent pitch
  const projectSectionRef = React.useRef<HTMLDivElement>(null);

  async function loadRegistry() {
    setErr("");
    const res = await fetch("/api/bridge/registry");
    if (!res.ok) {
      setErr(`Registry fetch failed: HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as Registry;
    setRegistry(data);

    const defChain = pickDefaultChain(data);
    setChain(defChain);

    const toks = tokensForChain(data, defChain);
    const defTok = toks.find((t: any) => String(t?.symbol ?? "").toUpperCase() === "USDC")?.symbol ?? toks[0]?.symbol ?? "USDC";
    setToken(defTok);
  }

  async function getQuote() {
    if (!selected) return setErr("Select a project first.");
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return setErr("Enter a valid amount.");
    
    setQuoteLoading(true);
    setErr("");
    setQuote(null);
    
    try {
      const res = await fetch("/api/bridge/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selected.id,
          amount: amountNum,
          token,
          chain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? `Quote failed: HTTP ${res.status}`);
        return;
      }
      setQuote(data);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setQuoteLoading(false);
    }
  }

  async function initiateRetirement() {
    if (!selected) return setErr("Select a project first.");
    if (!beneficiaryName.trim()) return setErr("Enter a beneficiary name.");
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return setErr("Enter a valid amount.");
    
    setRetireLoading(true);
    setErr("");
    setRetirement(null);
    
    try {
      const res = await fetch("/api/bridge/retire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selected.id,
          amount: amountNum,
          token,
          chain,
          beneficiaryName: beneficiaryName.trim(),
          retirementReason: retirementReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? `Retirement initiation failed: HTTP ${res.status}`);
        return;
      }
      setRetirement(data);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setRetireLoading(false);
    }
  }

  async function checkTx() {
    setErr("");
    setTxStatus(null);
    setScanInfo(null);

    const clean = txHash.trim();
    if (!clean) return setErr("Paste a tx hash.");

    const res = await fetch(`/api/bridge/tx?hash=${encodeURIComponent(clean)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data?.error ?? `Tx lookup failed: HTTP ${res.status}`);
      return;
    }
    setTxStatus(data);

    const scanRes = await fetch(`/api/ecotoken/scan?hash=${encodeURIComponent(clean)}`);
    const scanData = await scanRes.json().catch(() => null);
    if (scanData) setScanInfo(scanData);
  }

  function scrollToProjects() {
    projectSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  React.useEffect(() => {
    loadRegistry().catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const projects = (registry?.projects ?? []).filter((p: any) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p?.name ?? "").toLowerCase().includes(q) ||
      String(p?.location ?? "").toLowerCase().includes(q) ||
      String(p?.type ?? "").toLowerCase().includes(q) ||
      String(p?.registry ?? "").toLowerCase().includes(q)
    );
  });

  const chains = registry?.supportedTokens ? Object.keys(registry.supportedTokens) : [];
  const tokenList = tokensForChain(registry, chain);
  const deepLink =
    selected
      ? `https://bridge.eco/?tab=impact&project=${encodeURIComponent(String(selected?.id ?? ""))}&amount=${encodeURIComponent(amount)}&chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(token)}`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Retire Carbon Credits</div>
        <Muted>
          Use Bridge.eco to retire verified carbon credits. Process: choose project → get quote → initiate retirement → send payment → track to <code>RETIRED</code> → receive certificate.
          Verify publicly via <a href="https://scan.ecotoken.earth" target="_blank" rel="noreferrer" className="text-blue-400">scan.ecotoken.earth</a>.
        </Muted>
      </div>

      {/* AI Agent Sales Pitch */}
      <AgentPitch onGetStarted={scrollToProjects} />

      {err ? (
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{err}</div>
      ) : null}

      <Card title="Step 1: Configure Retirement">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-sm mb-1 text-neutral-300">Chain</div>
              <Select value={chain} onChange={(e) => setChain(e.target.value)}>
                {chains.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1 text-neutral-300">Token</div>
              <Select value={token} onChange={(e) => setToken(e.target.value)}>
                {tokenList.length ? tokenList.map((t: any) => (
                  <option key={t?.symbol} value={t?.symbol}>{t?.symbol}</option>
                )) : <option value="USDC">USDC</option>}
              </Select>
            </div>
            <div>
              <div className="text-sm mb-1 text-neutral-300">Amount (in token units)</div>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-sm mb-1 text-neutral-300">Beneficiary Name *</div>
              <Input 
                placeholder="Who should be credited with this offset?"
                value={beneficiaryName} 
                onChange={(e) => setBeneficiaryName(e.target.value)} 
              />
            </div>
            <div>
              <div className="text-sm mb-1 text-neutral-300">Retirement Reason</div>
              <Input 
                placeholder="e.g., AI compute offset, Q1 2024 operations"
                value={retirementReason} 
                onChange={(e) => setRetirementReason(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </Card>

      <div ref={projectSectionRef}>
        <Card title="Step 2: Choose Project">
          <div className="space-y-3">
            <Input
              placeholder="Search projects (name, location, type)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {projects.slice(0, 50).map((p: any) => {
                const active = selected?.id === p?.id;
                return (
                  <button
                    key={p?.id}
                    onClick={() => {
                      setSelected(p);
                      setQuote(null);
                      setRetirement(null);
                    }}
                    className={[
                      "w-full text-left rounded-2xl border px-4 py-3",
                      active
                        ? "border-green-700 bg-green-900/20"
                        : "border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900/20",
                    ].join(" ")}
                  >
                    <div className="font-medium">{p?.name}</div>
                    <div className="text-sm text-neutral-400">
                      {p?.type} • {p?.location} • {p?.registry}
                    </div>
                  </button>
                );
              })}
              {projects.length === 0 ? <Muted>No projects found.</Muted> : null}
            </div>
            <div className="text-xs text-neutral-500">
              Source: <a href="https://api.bridge.eco/registry" target="_blank" rel="noreferrer" className="text-blue-400">api.bridge.eco/registry</a>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Step 3: Get Quote & Initiate Retirement">
        {!selected ? (
          <Muted>Select a project above to continue.</Muted>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-900/50 bg-green-950/20 p-3">
              <div className="text-sm font-medium text-green-300">Selected Project</div>
              <div className="text-neutral-200">{selected.name}</div>
              <div className="text-xs text-neutral-400">{selected.type} • {selected.location}</div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={getQuote} disabled={quoteLoading}>
                {quoteLoading ? "Getting quote..." : "Get Quote"}
              </Button>
              {quote ? (
                <Button 
                  className="bg-green-600 text-white hover:bg-green-500"
                  onClick={initiateRetirement}
                  disabled={retireLoading || !beneficiaryName.trim()}
                >
                  {retireLoading ? "Initiating..." : "Initiate Retirement"}
                </Button>
              ) : null}
            </div>

            {quote ? (
              <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-3 space-y-2">
                <div className="text-sm font-medium text-blue-300">Quote Details</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-neutral-400">Amount:</div>
                  <div>{quote.amount} {quote.token}</div>
                  <div className="text-neutral-400">Estimated Credits:</div>
                  <div>{quote.estimatedCredits.toFixed(3)} tons CO₂</div>
                  <div className="text-neutral-400">Price per Credit:</div>
                  <div>${quote.pricePerCredit}</div>
                  <div className="text-neutral-400">Quote ID:</div>
                  <div className="font-mono text-xs">{quote.quoteId}</div>
                  <div className="text-neutral-400">Expires:</div>
                  <div>{new Date(quote.expiresAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ) : null}

            {retirement ? (
              <div className="rounded-xl border border-green-900/50 bg-green-950/20 p-3 space-y-3">
                <div className="text-sm font-medium text-green-300">🎉 Retirement Initiated!</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-neutral-400">Retirement ID:</div>
                  <div className="font-mono text-xs">{retirement.retirementId}</div>
                  <div className="text-neutral-400">Status:</div>
                  <div className="font-semibold">{retirement.status}</div>
                  <div className="text-neutral-400">Estimated Credits:</div>
                  <div>{retirement.estimatedCredits.toFixed(3)} tons CO₂</div>
                </div>
                
                <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
                  <div className="text-xs text-neutral-400 mb-1">Send payment to this address:</div>
                  <div className="font-mono text-sm break-all text-green-300">
                    {retirement.paymentAddress || selected?.evmWallet || "(missing)"}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {retirement.amount} {retirement.token} on {retirement.chain}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      const addr = retirement.paymentAddress || selected?.evmWallet;
                      if (addr) navigator.clipboard.writeText(String(addr));
                    }}
                    disabled={!retirement.paymentAddress && !selected?.evmWallet}
                  >
                    Copy Address
                  </Button>
                  <Button
                    className="bg-neutral-800 text-white hover:bg-neutral-700"
                    onClick={() => window.open(retirement.deepLink, "_blank")}
                  >
                    Open Bridge.eco Widget
                  </Button>
                </div>
                
                <Muted>
                  After sending payment, copy your transaction hash and use the tracking section below.
                </Muted>
              </div>
            ) : null}

            {!quote && !retirement ? (
              <Muted>
                Click "Get Quote" to see estimated credits and cost, then "Initiate Retirement" to start the process.
              </Muted>
            ) : null}
          </div>
        )}
      </Card>

      <Card title="Step 4: Track Status & Get Certificate">
        <div className="space-y-3">
          <Input
            placeholder="Paste transaction hash (0x...)"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={checkTx}>Check Status</Button>
            <Button
              className="bg-neutral-800 text-white hover:bg-neutral-700"
              onClick={() => {
                const h = txHash.trim();
                if (h) navigator.clipboard.writeText(h);
              }}
              disabled={!txHash.trim()}
            >
              Copy Hash
            </Button>
          </div>

          {txStatus ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-900 bg-black/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>Status:</span>
                  <span className={[
                    "font-semibold px-2 py-0.5 rounded",
                    txStatus?.status === "RETIRED" 
                      ? "bg-green-900/50 text-green-300" 
                      : "bg-yellow-900/50 text-yellow-300"
                  ].join(" ")}>
                    {txStatus?.status ?? "?"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <div className="text-neutral-400">USD value:</div>
                  <div>{txStatus?.usd_value ?? "?"}</div>
                  <div className="text-neutral-400">Credits:</div>
                  <div>{txStatus?.credits_amount ?? "?"} tons CO₂</div>
                  <div className="text-neutral-400">Certificate:</div>
                  <div className="font-mono text-xs">{txStatus?.certificate_id ?? "(pending)"}</div>
                </div>
              </div>

              {txStatus?.certificate_id ? (
                <div className="rounded-xl border border-green-900/50 bg-green-950/20 p-3">
                  <div className="text-green-300 font-medium">🏆 Retirement Complete!</div>
                  <div className="text-sm text-neutral-300 mt-1">
                    Your carbon credit retirement is verified and permanent. Share your certificate!
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    Post on Moltbook: "Just retired {txStatus?.credits_amount ?? "?"} tons of carbon via Bridge.eco. Certificate: {txStatus?.certificate_id}. Every agent can make a difference! 🌍"
                  </div>
                </div>
              ) : null}

              {scanInfo ? (
                <div className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-3 text-sm">
                  <div className="font-medium">Public Verification</div>
                  <div className="text-neutral-400">{scanInfo?.instruction}</div>
                  <div className="mt-2">
                    <a href={scanInfo?.scanUrl} target="_blank" rel="noreferrer" className="text-blue-400">
                      Open scan.ecotoken.earth →
                    </a>
                  </div>
                </div>
              ) : null}

              {Array.isArray(txStatus?.timeline) ? (
                <div className="space-y-2">
                  <div className="text-sm text-neutral-300">Timeline</div>
                  <div className="space-y-2">
                    {txStatus.timeline.map((t: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-neutral-900 bg-neutral-950/40 px-3 py-2 text-xs">
                        <div className="font-mono">{t?.step}</div>
                        <div className="text-neutral-400">{t?.status}</div>
                        <div className="text-neutral-500">{t?.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-neutral-400">
              <div className="font-medium mb-1">Retirement Lifecycle:</div>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs">PENDING</span>
                <span className="text-neutral-600">→</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs">DETECTED</span>
                <span className="text-neutral-600">→</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs">CONVERTED</span>
                <span className="text-neutral-600">→</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-xs">CALCULATED</span>
                <span className="text-neutral-600">→</span>
                <span className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded text-xs">RETIRED</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* API Reference for Agents */}
      <Card title="🔌 Agent API Reference">
        <div className="space-y-3">
          <Muted>
            For programmatic access, use the Agent Carbon API at <code className="text-blue-400">/api/agent/carbon</code>
          </Muted>
          <div className="text-xs font-mono bg-black/30 rounded-lg p-3 space-y-1 overflow-x-auto">
            <div className="text-green-400"># Get API documentation</div>
            <div>GET /api/agent/carbon?action=info</div>
            <div className="mt-2 text-green-400"># Estimate compute carbon footprint</div>
            <div>GET /api/agent/carbon?action=estimate&computeHours=100&modelSize=medium</div>
            <div className="mt-2 text-green-400"># List projects</div>
            <div>GET /api/agent/carbon?action=projects</div>
            <div className="mt-2 text-green-400"># Get retirement quote</div>
            <div>GET /api/agent/carbon?action=quote&projectId=ID&amount=25&token=USDC&chain=base</div>
            <div className="mt-2 text-green-400"># Initiate retirement (POST)</div>
            <div>POST /api/agent/carbon {"{"} projectId, amount, token, chain, beneficiaryName {"}"}</div>
            <div className="mt-2 text-green-400"># Track status</div>
            <div>GET /api/agent/carbon?action=status&txHash=0x...</div>
          </div>
          <div className="text-xs text-neutral-500">
            Reference: <a href="https://climate.0g.ai/" target="_blank" rel="noreferrer" className="text-blue-400">climate.0g.ai</a> • 
            Powered by <a href="https://bridge.eco" target="_blank" rel="noreferrer" className="text-blue-400">Bridge.eco</a>
          </div>
        </div>
      </Card>
    </div>
  );
}
