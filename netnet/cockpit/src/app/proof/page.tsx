"use client";

import React from "react";
import { Button, Card, Muted } from "@/components/ui";

export default function ProofPage() {
  const [result, setResult] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  async function callPaid() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/proof-paid", { method: "GET" });
      const text = await res.text();
      setResult(`HTTP ${res.status}\n\n${text}`);
    } catch (e: any) {
      setResult(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Proof</div>
        <Muted>Confirm the x402 paywall is working, and produce a receipt-like proof endpoint for agents.</Muted>
      </div>

      <Card title="Paid endpoint check (x402)">
        <div className="space-y-3">
          <Muted>
            This calls <code>/api/proof-paid</code>. Without a buyer that can complete x402, you should see a <code>402</code> + challenge headers.
          </Muted>
          <div>
            <Button onClick={callPaid} disabled={loading}>
              {loading ? "Calling..." : "Call /api/proof-paid"}
            </Button>
          </div>
          {result ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-neutral-900 bg-black/40 p-3 text-xs">
              {result}
            </pre>
          ) : null}
        </div>
      </Card>

      <Card title="Next (planned)">
        <Muted>
          Attach proof objects to retirements (Bridge.eco) and verifications (ecoToken scan), then export as a compact post for Moltbook/X.
        </Muted>
      </Card>
    </div>
  );
}
