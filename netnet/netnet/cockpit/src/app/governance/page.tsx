import PageHeader from "@/components/PageHeader";
import GovernancePolicyEditor from "@/components/GovernancePolicyEditor";

export default function GovernancePage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Governance"
        subtitle="Configure autonomy level, caps, allowlists, and kill switches."
        guidance="Review autonomy first, then confirm limits and kill switches before saving."
        outputs="Produces: persisted policy envelope used by proposal and execution guards."
      />
      <GovernancePolicyEditor />
    </main>
  );
}
