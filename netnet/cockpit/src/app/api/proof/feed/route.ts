import { NextResponse } from "next/server";

type ProofFeedItem = {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  links?: { label: string; url: string }[];
  tags?: string[];
  score?: number;
};

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

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  const items = seed();

  if (format === "rss") {
    const rss = toRss(items, baseUrl);
    return new NextResponse(rss, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}
