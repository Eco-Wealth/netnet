import Shell from "@/components/Shell";
import GovernancePolicyEditor from "@/components/GovernancePolicyEditor";

export default function GovernancePage() {
  return (
    <Shell title="Governance" subtitle="Permissions, budgets, allowlists, and kill switches. Operator-first.">
      <div className="grid gap-4">
        <GovernancePolicyEditor />
      </div>
    </Shell>
  );
}
