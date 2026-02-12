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

  // Optional proof subject/context metadata used by route contracts.
  agentId?: string;
  wallet?: string;
  operator?: string;
  url?: string;
  why?: string;
};

function cleanList(v?: string[]) {
  return (v || []).map((s) => s.trim()).filter(Boolean);
}

function dropEmpty<T extends Record<string, unknown>>(obj: T | undefined): T | undefined {
  if (!obj) return undefined;
  const values = Object.values(obj);
  const hasValue = values.some((v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
  return hasValue ? obj : undefined;
}

export function buildRegenProjectPacket(input: RegenProjectRequest): RegenProjectPacketV1 {
  return {
    schema: "netnet.regen.project.v1",
    ts: new Date().toISOString(),
    title: (input.title || "").trim(),
    summary: (input.summary || "").trim(),
    buyer: dropEmpty({
      class: input.buyerClass,
      name: input.buyerName,
      mandate: input.buyerMandate,
    }),
    location: dropEmpty({
      country: input.country,
      region: input.region,
      lat: input.lat,
      lon: input.lon,
    }),
    mrv: {
      methodology: input.methodology,
      assumptions: cleanList(input.mrvAssumptions),
      requiredFields: cleanList(input.requiredFields),
      dataSources: cleanList(input.dataSources),
      cadence: input.cadence,
      confidence: input.confidence,
    },
    commercial: dropEmpty({
      unit: input.unit,
      volumeEstimate: input.volumeEstimate,
      priceAssumption: input.priceAssumption,
      timeline: input.timeline,
    }),
    constraints: dropEmpty({
      landControl: input.landControl,
      risks: cleanList(input.risks),
      mitigations: cleanList(input.mitigations),
    }),
    nextSteps: cleanList(input.nextSteps),
  };
}
