"use client";

import { useEffect, useMemo, useState } from "react";

type ProofKind =
  | "x402"
  | "bridge_retirement"
  | "ecotoken_scan"
  | "agent_action"
  | "trade_attempt";

type ProofObject = {
  schema: "netnet.proof.v1";
  id: string;
  kind: ProofKind;
  timestamp: string;
  subject: { agentId?: string; wallet?: string; operator?: string };
  refs: { txHash?: string; certificateId?: string; url?: string };
  claims: Record<string, unknown>;
  signatures?: { type: string; value: string }[];
};

function isTxHash(v: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(v);
}

function copy(text: string) {
  return navigator.clipboard.writeText(text);
}

function stableStringify(value: unknown) {
  // lightweight: server already canonicalizes; this is just for copy/export readability
  return JSON.stringify(value, null, 2);
}

export default function ProofObjectPanel() {
  const [kind, setKind] = useState<ProofKind>("bridge_retirement");
  const [txHash, setTxHash] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [url, setUrl] = useState("");
  const [why, setWhy] = useState("verifiable, machine-readable receipt");
  const [agentId, setAgentId] = useState("");
  const [wallet, setWallet] = useState("");
  const [operator, setOperator] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [proof, setProof] = useState<ProofObject | null>(null);
  const [shortPost, setShortPost] = useState<string>("");
  const [longPost, setLongPost] = useState<string>("");
  const [verifyUrl, setVerifyUrl] = useState<string>("");

  // Restore last proof input/output
  useEffect(() => {
    try {
      const saved = localStorage.getItem("netnet.proof.last");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.input) {
        setKind(parsed.input.kind ?? "bridge_retirement");
        setTxHash(parsed.input.txHash ?? "");
        setCertificateId(parsed.input.certificateId ?? "");
        setUrl(parsed.input.url ?? "");
        setWhy(parsed.input.why ?? "verifiable, machine-readable receipt");
        setAgentId(parsed.input.agentId ?? "");
        setWallet(parsed.input.wallet ?? "");
        setOperator(parsed.input.operator ?? "");
      }
      if (parsed?.proof) setProof(parsed.proof);
      if (typeof parsed?.verifyUrl === "string") setVerifyUrl(parsed.verifyUrl);
      if (parsed?.posts) {
        setShortPost(parsed.posts.short ?? "");
        setLongPost(parsed.posts.long ?? "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "netnet.proof.last",
        JSON.stringify({
          input: { kind, txHash, certificateId, url, why, agentId, wallet, operator },
          proof,
          verifyUrl,
          posts: { short: shortPost, long: longPost },
        })
      );
    } catch {
      // ignore
    }
  }, [
    kind,
    txHash,
    certificateId,
    url,
    why,
    agentId,
    wallet,
    operator,
    proof,
    verifyUrl,
    shortPost,
    longPost,
  ]);

  const canBuild = useMemo(() => {
    if (txHash && !isTxHash(txHash)) return false;
    return true;
  }, [txHash]);

  async function build() {
    setStatus("loading");
    setErrorMsg(null);
    setProof(null);
    setVerifyUrl("");

    try {
      const res = await fetch("/api/proof/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          subject: { agentId: agentId || undefined, wallet: wallet || undefined, operator: operator || undefined },
          refs: { txHash: txHash || undefined, certificateId: certificateId || undefined, url: url || undefined },
          claims: { why },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setStatus("error");
        setErrorMsg(data?.error?.message ?? `Request failed (${res.status})`);
        return;
      }

      const p: ProofObject = data.proof;
      setProof(p);
      setVerifyUrl(typeof data?.verifyUrl === "string" ? data.verifyUrl : `/proof/${p.id}`);

      // Ask server for post formats by reusing proof in client (simple deterministic)
      // For now, build in-client using the proof's fields.
      const refs: string[] = [];
      if (p.refs.certificateId) refs.push(`cert:${p.refs.certificateId}`);
      if (p.refs.txHash) refs.push(`tx:${p.refs.txHash.slice(0, 10)}…`);
      if (p.refs.url) refs.push(p.refs.url);
      const who = p.subject.agentId || p.subject.operator || p.subject.wallet || "operator";
      const what =
        p.kind === "bridge_retirement"
          ? "Carbon credits retired"
          : p.kind === "ecotoken_scan"
          ? "ecoToken verification link generated"
          : p.kind === "x402"
          ? "x402 paywall satisfied"
          : p.kind === "trade_attempt"
          ? "Trade attempt (paper/plan)"
          : "Proof created";
      const refStr = refs.length ? refs.join(" · ") : `proof:${p.id.slice(0, 10)}…`;
      const short = `${what} by ${who}. ${refStr}. ${why}`.slice(0, 280);
      const long = [
        `${what}`,
        ``,
        `who: ${who}`,
        `kind: ${p.kind}`,
        `id: ${p.id}`,
        ...(p.refs.txHash ? [`tx: ${p.refs.txHash}`] : []),
        ...(p.refs.certificateId ? [`certificate: ${p.refs.certificateId}`] : []),
        ...(p.refs.url ? [`link: ${p.refs.url}`] : []),
        ``,
        `why: ${why}`,
      ].join("\n");

      setShortPost(short);
      setLongPost(long);

      setStatus("ok");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Unknown error");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Proof objects</h2>
        <span className="text-xs text-white/60">schema: netnet.proof.v1</span>
      </div>

      <p className="mt-2 text-sm text-white/70">
        Build an exportable proof JSON object + ready-to-post text. Stores the latest proof locally in this browser.
      </p>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-white/60">Kind</span>
          <select
            className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as ProofKind)}
          >
            <option value="bridge_retirement">bridge_retirement</option>
            <option value="ecotoken_scan">ecotoken_scan</option>
            <option value="x402">x402</option>
            <option value="agent_action">agent_action</option>
            <option value="trade_attempt">trade_attempt</option>
          </select>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs text-white/60">txHash (optional)</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value.trim())}
              placeholder="0x…"
            />
            {txHash && !isTxHash(txHash) ? (
              <span className="text-xs text-red-300">Invalid tx hash format (must be 0x + 64 hex)</span>
            ) : null}
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">certificateId (optional)</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              placeholder="Bridge certificate id"
            />
          </label>

          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs text-white/60">url (optional)</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs text-white/60">subject.agentId</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              placeholder="agent name/id"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">subject.wallet</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
              placeholder="0x…"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">subject.operator</span>
            <input
              className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="Brandon / operator"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs text-white/60">Why it matters (used in post text)</span>
          <input
            className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="verifiable, machine-readable receipt"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={build}
            disabled={!canBuild || status === "loading"}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {status === "loading" ? "Building…" : "Build proof"}
          </button>

          {proof ? (
            <>
              <button
                onClick={() => copy(stableStringify(proof))}
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm"
              >
                Copy JSON
              </button>
              <button
                onClick={() => copy(shortPost)}
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm"
              >
                Copy short post
              </button>
              <button
                onClick={() => copy(longPost)}
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm"
              >
                Copy long post
              </button>
              <button
                onClick={() =>
                  copy(
                    verifyUrl.startsWith("http")
                      ? verifyUrl
                      : `${location.origin}${verifyUrl}`
                  )
                }
                className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm"
              >
                Copy verify URL
              </button>
            </>
          ) : null}
        </div>

        {status === "error" ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {errorMsg ?? "Error"}
          </div>
        ) : null}

        {proof ? (
          <div className="mt-3 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Proof JSON</div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
                {stableStringify(proof)}
              </pre>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Moltbook/X post (short)</div>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{shortPost}</pre>
            </div>

            {verifyUrl ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Verify URL</div>
                <a
                  href={verifyUrl}
                  className="mt-2 inline-block break-all text-xs text-sky-300 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {verifyUrl}
                </a>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-white/60">Moltbook/X post (long)</div>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{longPost}</pre>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
