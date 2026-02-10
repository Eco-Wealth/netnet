export type RegenRegistryProjectPacketV1 = {
  schema: "netnet.regen.project_packet.v1";
  createdAt: string; // ISO
  operator: {
    name?: string;
    org?: string;
    contact?: string;
  };
  project: {
    name: string;
    summary: string;
    location?: string;
    methodology?: string;
    sdgs?: string[];
    links?: { label: string; url: string }[];
  };
  mrv: {
    approach: string;
    dataSources?: string[];
    frequency?: string;
    risks?: string[];
  };
  commercialization: {
    buyerClass?: string;
    contractPath?: string;
    targetVintage?: string;
  };
  safety: {
    readOnly: true;
    note: string;
  };
};

export function newProjectPacketTemplate(): RegenRegistryProjectPacketV1 {
  return {
    schema: "netnet.regen.project_packet.v1",
    createdAt: new Date().toISOString(),
    operator: {
      name: process.env.NETNET_OPERATOR_NAME,
      org: process.env.NETNET_OPERATOR_ORG,
      contact: process.env.NETNET_OPERATOR_CONTACT,
    },
    project: {
      name: "Example Regen Registry Project",
      summary:
        "One-paragraph project summary: what, where, why it matters, and who benefits.",
      location: "Region / watershed / coordinates (optional)",
      methodology: "Methodology name or draft reference",
      sdgs: ["SDG 13", "SDG 15"],
      links: [
        { label: "Project site", url: "https://example.com" },
        { label: "Evidence folder", url: "https://example.com/evidence" },
      ],
    },
    mrv: {
      approach:
        "Describe MRV approach: measurements, models, verification steps, and auditability.",
      dataSources: ["satellite", "field samples", "third-party audits"],
      frequency: "Quarterly",
      risks: ["Data gaps", "Leakage risk", "Permanence risk"],
    },
    commercialization: {
      buyerClass: "Utility / brand / insurer / municipality",
      contractPath: "LOI → MSA → Purchase agreement",
      targetVintage: "2026",
    },
    safety: {
      readOnly: true,
      note:
        "This packet is for planning + registry preparation. No on-chain writes; operator approval required for any execution outside netnet.",
    },
  };
}
