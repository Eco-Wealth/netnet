export type RegenProjectPacketV1 = {
  schema: "netnet.regen.project.v1";
  ts: string;

  title: string;
  summary: string;

  buyer?: {
    class?: string;
    name?: string;
    mandate?: string;
  };

  location?: {
    country?: string;
    region?: string;
    lat?: number;
    lon?: number;
  };

  mrv: {
    methodology?: string;
    assumptions: string[];
    requiredFields: string[];
    dataSources?: string[];
    cadence?: string;
    confidence?: "low" | "medium" | "high";
  };

  commercial?: {
    unit?: string;
    volumeEstimate?: string;
    priceAssumption?: string;
    timeline?: string;
  };

  constraints?: {
    landControl?: string;
    risks?: string[];
    mitigations?: string[];
  };

  nextSteps: string[];
};

export type RegenProjectRequest = {
  agentId?: string;
  wallet?: string;
  operator?: string;
  url?: string;
  why?: string;
  title?: string;
  summary?: string;
  buyerClass?: string;
  buyerName?: string;
  buyerMandate?: string;
  country?: string;
  region?: string;
  lat?: number;
  lon?: number;
  methodology?: string;
  mrvAssumptions?: string[];
  requiredFields?: string[];
  dataSources?: string[];
  cadence?: string;
  confidence?: "low" | "medium" | "high";
  unit?: string;
  volumeEstimate?: string;
  priceAssumption?: string;
  timeline?: string;
  landControl?: string;
  risks?: string[];
  mitigations?: string[];
  nextSteps?: string[];
};

export function buildRegenProjectPacket(input: RegenProjectRequest): RegenProjectPacketV1 {
  const ts = new Date().toISOString();

  const title = (input.title || "").trim();
  const summary = (input.summary || "").trim();

  const assumptions = (input.mrvAssumptions || []).map((s) => s.trim()).filter(Boolean);
  const requiredFields = (input.requiredFields || []).map((s) => s.trim()).filter(Boolean);

  const packet: RegenProjectPacketV1 = {
    schema: "netnet.regen.project.v1",
    ts,
    title,
    summary,
    buyer: {
      class: input.buyerClass,
      name: input.buyerName,
      mandate: input.buyerMandate,
    },
    location: {
      country: input.country,
      region: input.region,
      lat: input.lat,
      lon: input.lon,
    },
    mrv: {
      methodology: input.methodology,
      assumptions,
      requiredFields,
      dataSources: input.dataSources || [],
      cadence: input.cadence,
      confidence: input.confidence,
    },
    commercial: {
      unit: input.unit,
      volumeEstimate: input.volumeEstimate,
      priceAssumption: input.priceAssumption,
      timeline: input.timeline,
    },
    constraints: {
      landControl: input.landControl,
      risks: input.risks || [],
      mitigations: input.mitigations || [],
    },
    nextSteps: input.nextSteps || [],
  };

  // Remove empty objects
  if (packet.buyer && !packet.buyer.class && !packet.buyer.name && !packet.buyer.mandate) delete (packet as any).buyer;
  if (packet.location && !packet.location.country && !packet.location.region && packet.location.lat == null && packet.location.lon == null) delete (packet as any).location;

  return packet;
}
