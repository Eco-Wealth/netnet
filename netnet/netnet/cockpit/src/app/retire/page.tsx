'use client';

import { useState } from 'react';
import PageHeader from "@/components/PageHeader";
import { Button, Input } from "@/components/ui";

export default function RetirePage() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');

  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Retire"
        subtitle="Step through a retirement intent flow."
        guidance="Enter project, amount, and transaction hash, then track status and generate proof."
        outputs="Produces: retirement intent state and proof handoff context."
      />

      {step === 1 && (
        <div className="nn-surface grid gap-2">
          <label className="block text-sm text-white/80">Project ID</label>
          <Input value={project} onChange={e=>setProject(e.target.value)} />
          <div>
            <Button onClick={()=>setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="nn-surface grid gap-2">
          <label className="block text-sm text-white/80">Amount</label>
          <Input value={amount} onChange={e=>setAmount(e.target.value)} />
          <div>
            <Button onClick={()=>setStep(3)}>Get Quote</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="nn-surface grid gap-2">
          <p className="text-sm text-white/75">Send payment via Bridge.eco, then paste tx hash.</p>
          <Input placeholder="0x..." value={txHash} onChange={e=>setTxHash(e.target.value)} />
          <div>
            <Button onClick={()=>setStep(4)}>Track</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="nn-surface grid gap-2">
          <p className="text-sm text-emerald-300">Retirement tracked.</p>
          <a className="text-sm underline text-white/80 hover:text-white" href="/proof">Generate Proof</a>
        </div>
      )}
    </div>
  );
}
