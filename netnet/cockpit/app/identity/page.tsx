import AgentIdentityCard from "@/components/AgentIdentityCard";

export const metadata = { title: "Agent Identity" };

export default function IdentityPage() {
  return (
    <main className="mx-auto w-full max-w-xl p-4">
      <h1 className="mb-2 text-2xl font-semibold">Identity</h1>
      <p className="mb-4 text-sm text-white/70">
        Local-only identity fields used to populate proof objects. No keys, no secrets.
      </p>
      <AgentIdentityCard />
    </main>
  );
}
