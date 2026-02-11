'use client';

import { useState } from 'react';
import { Button, Card, HoverInfo, Input, Label, Muted } from "@/components/ui";

export default function RetirePage() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Retire Credits</h1>
      <Muted>Proposal-first carbon retirement flow. Execution requires explicit approval.</Muted>

      {step === 1 && (
        <Card title="Step 1: Select project">
          <div className="space-y-2">
            <Label>Project ID</Label>
            <Input value={project} onChange={(e)=>setProject(e.target.value)} />
            <Button
              onClick={()=>setStep(2)}
              insight={{
                what: "Move to quote planning.",
                when: "After selecting a candidate project.",
                requires: "Project identifier.",
                output: "Amount entry step.",
              }}
            >
              Next
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 2: Set amount">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={amount} onChange={(e)=>setAmount(e.target.value)} />
            <Button
              onClick={()=>setStep(3)}
              insight={{
                what: "Generate retirement quote context.",
                when: "After amount is selected.",
                requires: "Project + amount. Quote API calls.",
                output: "Payment + tracking prompt.",
              }}
            >
              Get Quote
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Step 3: Track payment">
          <div className="space-y-2">
            <p className="text-sm">Send payment via Bridge.eco, then paste tx hash.</p>
            <Input placeholder="0x..." value={txHash} onChange={(e)=>setTxHash(e.target.value)} />
            <Button
              onClick={()=>setStep(4)}
              insight={{
                what: "Track retirement progression.",
                when: "After transaction hash is available.",
                requires: "Valid tx hash. Read-only status lookup.",
                output: "Tracking status and proof handoff.",
              }}
            >
              Track
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="Step 4: Proof handoff">
          <div className="space-y-2">
            <p className="text-[color:var(--success)]">Retirement tracked.</p>
            <a className="underline" href="/proof">Generate Proof</a>
            <HoverInfo
              label={<span className="nn-chip">Why proof</span>}
              what="Proof object makes this action auditable for operators and agents."
              when="Use after retirement tracking to support economics and policy review."
              requires="Tx/certificate references."
              output="netnet.proof.v1 object."
            />
          </div>
        </Card>
      )}
    </div>
  );
}
