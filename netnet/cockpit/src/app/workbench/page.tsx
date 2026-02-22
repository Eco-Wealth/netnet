import PageHeader from "@/components/PageHeader";
import Workbench from "@/components/work/Workbench";

export default function Page() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Workbench"
        subtitle="Run quick endpoint checks with optional work-item logging."
        guidance="Pick one action to run. If a work item is active, events are appended automatically."
        outputs="Produces: endpoint response JSON plus optional work item id + appended work events."
      />
      <Workbench />
    </div>
  );
}
