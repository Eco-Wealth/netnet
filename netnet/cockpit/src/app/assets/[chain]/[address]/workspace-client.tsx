"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Label, Muted, Row, StatusChip } from "@/components/ui";

type ScanResp =
  | { ok: true; kind: "asset" | "tx"; url: string; instructions: string; input?: any }
  | { ok: false; error: string };

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 160)}`);
  }
}

export default function AssetWorkspaceClient({
  chain,
  address,
}: {
  chain: string;
  address: string;
}) {
  const assetKey = useMemo(() => `${chain}:${address}`, [chain, address]);

  const [scan, setScan] = useState<ScanResp | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [workCreateLoading, setWorkCreateLoading] = useState(false);
  const [workCreatedId, setWorkCreatedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runScan() {
    setErr(null);
    setScanLoading(true);
    try {
      const q = new URLSearchParams({ chain, address });
      const data = await getJSON<ScanResp>(`/api/ecotoken/scan?${q.toString()}`);
      setScan(data);
    } catch (e: any) {
      setErr(e?.message || "Scan failed");
    } finally {
      setScanLoading(false);
    }
  }

  async function createWorkSeed() {
    setErr(null);
    setWorkCreateLoading(true);
    try {
      const r = await fetch("/api/work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `Asset workspace: ${assetKey}`,
          description:
            "Seeded from Asset Workspace. Operator review required before any execution.",
          tags: ["asset-workspace", chain],
          priority: "MEDIUM",
          owner: "operator",
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || `Create failed (${r.status})`);
      setWorkCreatedId(data.id || data.item?.id || null);
    } catch (e: any) {
      setErr(e?.message || "Create work failed");
    } finally {
      setWorkCreateLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Card>
        <Row>
          <div>
            <div className="text-sm font-semibold">Asset</div>
            <Muted>{assetKey}</Muted>
          </div>
          <StatusChip tone="neutral">READ-ONLY</StatusChip>
        </Row>

        <div className="mt-3 grid gap-2">
          <Row>
            <Button
              onClick={runScan}
              disabled={scanLoading}
              title="Generate an EcoToken Scan link for this chain+address."
            >
              {scanLoading ? "Scanning…" : "Run scan"}
            </Button>

            <Button
              variant="ghost"
              onClick={createWorkSeed}
              disabled={workCreateLoading}
              title="Create a work item so an operator or agent can track actions on this asset."
            >
              {workCreateLoading ? "Creating…" : "Create work item"}
            </Button>
          </Row>

          {workCreatedId ? (
            <Muted>
              Work created: <span className="font-mono">{workCreatedId}</span>
            </Muted>
          ) : null}

          {scan?.ok ? (
            <div className="mt-2 grid gap-1">
              <Label>Scan URL</Label>
              <a
                href={scan.url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm underline"
                title="Open EcoToken Scan in a new tab."
              >
                {scan.url}
              </a>
              <Muted>{scan.instructions}</Muted>
            </div>
          ) : scan && !scan.ok ? (
            <Muted>Scan error: {scan.error}</Muted>
          ) : null}

          {err ? <Muted>{err}</Muted> : null}
        </div>
      </Card>
    </div>
  );
}
