'use client';

import { useState } from 'react';

export default function RetirePage() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-xl font-semibold">Retire Credits</h1>

      {step === 1 && (
        <div className="space-y-2">
          <label className="block text-sm">Project ID</label>
          <input className="w-full border p-2 rounded" value={project} onChange={e=>setProject(e.target.value)} />
          <button onClick={()=>setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <label className="block text-sm">Amount</label>
          <input className="w-full border p-2 rounded" value={amount} onChange={e=>setAmount(e.target.value)} />
          <button onClick={()=>setStep(3)}>Get Quote</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p>Send payment via Bridge.eco, then paste tx hash.</p>
          <input className="w-full border p-2 rounded" placeholder="0x..." value={txHash} onChange={e=>setTxHash(e.target.value)} />
          <button onClick={()=>setStep(4)}>Track</button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2">
          <p className="text-green-600">Retirement tracked.</p>
          <a className="underline" href="/proof">Generate Proof</a>
        </div>
      )}
    </div>
  );
}
