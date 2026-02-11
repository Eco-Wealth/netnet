import EconomicsLoopClient from "./loop-client";

export const dynamic = "force-dynamic";

export default function EconomicsLoopPage() {
  return (
    <div className="grid gap-4">
      <div>
        <div className="text-lg font-semibold">Economics Loop</div>
        <div className="text-sm opacity-70">
          Revenue → Allocation → Retire intent. Proposal-only outputs with proof + optional work item.
        </div>
      </div>
      <EconomicsLoopClient />
    </div>
  );
}
