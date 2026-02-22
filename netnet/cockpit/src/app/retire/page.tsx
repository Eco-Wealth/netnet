'use client';

import Link from "next/link";
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
        title="Retire Credits"
        subtitle="Simple retirement flow for agents and operators."
        guidance="Enter project and amount, submit settlement, then track and finalize proof receipt."
        outputs="Produces: retirement progress state and certificate-proof handoff context."
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link href="/operator" className="nn-shell-navLink">Operator</Link>
            <Link href="/proof" className="nn-shell-navLink">Proof</Link>
          </div>
        }
      />

      {step === 1 && (
        <div className="nn-surface grid gap-2">
          <label className="block text-sm text-white/80">Project ID</label>
          <Input value={project} onChange={e=>setProject(e.target.value)} placeholder="project-..." />
          <div>
            <Button onClick={()=>setStep(2)} disabled={!project.trim()}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="nn-surface grid gap-2">
          <label className="block text-sm text-white/80">Amount</label>
          <Input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100" />
          <div>
            <Button onClick={()=>setStep(3)} disabled={!amount.trim()}>Get Quote</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="nn-surface grid gap-2">
          <p className="text-sm text-white/75">Settle via Bridge.eco, then paste transaction hash.</p>
          <Input placeholder="0x..." value={txHash} onChange={e=>setTxHash(e.target.value)} />
          <div>
            <Button onClick={()=>setStep(4)} disabled={!txHash.trim()}>Track Retirement</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="nn-surface grid gap-2">
          <p className="text-sm text-emerald-300">Retirement tracked and ready for proof.</p>
          <div>
            <Link className="nn-shell-navLink nn-shell-navLinkActive" href="/proof">
              Generate Retirement Certificate-Proof
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
