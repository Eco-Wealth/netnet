import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { verifyProofArtifact } from "@/lib/proof/registry";

export const dynamic = "force-dynamic";

type Params = { id: string };

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function ProofVerifyPage({ params }: { params: Params }) {
  const id = decodeURIComponent(params.id || "").trim();
  const verification = id ? verifyProofArtifact(id) : null;

  if (!verification) {
    return (
      <main className="nn-page-stack">
        <PageHeader
          title="Proof Verify"
          subtitle="Proof artifact was not found."
          guidance="Generate a new proof from /proof, then open its verify URL."
          outputs="Produces: verification status for one proof id."
          rightSlot={
            <Link href="/proof" className="nn-shell-navLink">
              Open Proof Builder
            </Link>
          }
        />
        <section className="nn-surface">
          <p className="nn-page-lead">
            No proof exists for <span className="font-mono">{id || "(empty id)"}</span>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="nn-page-stack">
      <PageHeader
        title="Proof Verify"
        subtitle={`Verification for ${verification.id}`}
        guidance="Valid means hash + id are consistent with the stored proof payload."
        outputs="Produces: machine-readable verification status and canonical proof payload."
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/api/proof/verify/${verification.id}`}
              className="nn-shell-navLink"
            >
              Verify API
            </Link>
            <Link href="/proof" className="nn-shell-navLink">
              Build Proof
            </Link>
          </div>
        }
      />

      <section className="nn-surface">
        <div className="grid gap-2 text-sm">
          <div>
            Status:{" "}
            <span
              className={
                verification.valid
                  ? "font-semibold text-emerald-300"
                  : "font-semibold text-amber-300"
              }
            >
              {verification.valid ? "VALID" : "INVALID"}
            </span>
          </div>
          <div>
            Schema: <span className="font-mono">{verification.schema}</span>
          </div>
          <div>
            Kind: <span className="font-mono">{verification.kind}</span>
          </div>
          <div>
            Created:{" "}
            <span className="font-mono">{verification.createdAtIso}</span>
          </div>
          <div>
            Stored hash:{" "}
            <span className="font-mono break-all">{verification.hash}</span>
          </div>
          <div>
            Computed hash:{" "}
            <span className="font-mono break-all">
              {verification.computedHash}
            </span>
          </div>
        </div>
      </section>

      <section className="nn-surface">
        <h2 className="mb-2 text-base font-semibold">Verification JSON</h2>
        <pre className="overflow-x-auto text-xs leading-relaxed">
          {prettyJson(verification)}
        </pre>
      </section>
    </main>
  );
}
