import AgentIdentityCard from "@/components/AgentIdentityCard";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Agent Identity" };

export default function IdentityPage() {
  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Identity"
        subtitle="Manage local identity fields used in proof payloads."
        guidance="Set display name and optional wallet/profile fields. Changes save locally in-browser."
        outputs="Produces: local identity metadata embedded into newly generated proof objects."
      />
      <AgentIdentityCard />
    </main>
  );
}
