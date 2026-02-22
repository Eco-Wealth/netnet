import { NextResponse } from "next/server";
import { listProofArtifacts } from "@/lib/proof/registry";

type ProofFeedItem = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  links?: { label: string; url: string }[];
  tags?: string[];
  score?: number;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function scoreForKind(kind: string): number {
  if (kind === "bridge_retirement") return 8;
  if (kind === "trade_attempt") return 5;
  if (kind === "agent_action") return 4;
  return 3;
}

function kindLabel(kind: string): string {
  return kind
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function fromRegistryItems(): ProofFeedItem[] {
  return listProofArtifacts(120).map((artifact) => {
    const claims = toRecord(artifact.payload.claims);
    const summary =
      readString(claims.why) ||
      readString(artifact.metadata?.resultSummary) ||
      "Proof artifact is available for verification and sharing.";
    const tags = [
      "proof",
      artifact.kind,
      readString(artifact.metadata?.action),
    ].filter(Boolean);
    return {
      id: artifact.id,
      createdAt: artifact.createdAtIso,
      title: `Proof: ${kindLabel(artifact.kind) || "Artifact"}`,
      summary,
      tags,
      score: scoreForKind(artifact.kind),
      links: [
        { label: "Proof UI", url: artifact.verifyUrl },
        { label: "Verify API", url: `/api/proof/verify/${artifact.id}` },
      ],
    };
  });
}

function seed(): ProofFeedItem[] {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  return [
    {
      id: "demo-proof-build",
      createdAt: iso(now - 1000 * 60 * 20),
      title: "Proof object generated",
      summary: "netnet.proof.v1 created for an operator-approved action. Use this as a shareable artifact.",
      tags: ["proof", "operator"],
      score: 5,
      links: [
        { label: "Proof UI", url: "/proof" },
        { label: "Build API", url: "/api/proof/build" },
      ],
    },
    {
      id: "demo-retire-plan",
      createdAt: iso(now - 1000 * 60 * 60 * 5),
      title: "Retirement plan prepared",
      summary: "Bridge quote + retirement initiation packet generated (approval required to execute).",
      tags: ["retire", "bridge"],
      score: 8,
      links: [
        { label: "Retire UI", url: "/retire" },
        { label: "Bridge registry", url: "/api/bridge/registry" },
      ],
    },
    {
      id: "demo-trade-plan",
      createdAt: iso(now - 1000 * 60 * 60 * 28),
      title: "Trade plan drafted (DRY_RUN)",
      summary: "Paper-trade planning stub produced a capped execution plan (no broadcast).",
      tags: ["trade", "dry_run"],
      score: 3,
      links: [
        { label: "Execute UI", url: "/execute" },
        { label: "Trade API", url: "/api/agent/trade?action=info" },
      ],
    },
  ];
}

function toRss(items: ProofFeedItem[], baseUrl: string) {
  const esc = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  const channelItems = items
    .map((it) => {
      const link = `${baseUrl}/distribute#${it.id}`;
      return `
        <item>
          <title>${esc(it.title)}</title>
          <link>${esc(link)}</link>
          <guid>${esc(it.id)}</guid>
          <pubDate>${esc(new Date(it.createdAt).toUTCString())}</pubDate>
          <description>${esc(it.summary)}</description>
        </item>
      `.trim();
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>netnet proofs</title>
    <link>${esc(baseUrl)}/distribute</link>
    <description>Shareable proofs and progress feed</description>
    ${channelItems}
  </channel>
</rss>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const baseUrl = url.origin;

  const items = fromRegistryItems();
  const feedItems = items.length > 0 ? items : seed();

  if (format === "rss") {
    const rss = toRss(feedItems, baseUrl);
    return new NextResponse(rss, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { ok: true, items: feedItems },
    { headers: { "cache-control": "no-store" } }
  );
}
