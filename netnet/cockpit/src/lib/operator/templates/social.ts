export type SocialChannel = "youtube" | "x" | "instagram" | "facebook";

export const SOCIAL_AUTOPUBLISH_ORDER: readonly SocialChannel[] = [
  "youtube",
  "x",
  "instagram",
  "facebook",
];

export type SocialAutopublishInput = {
  topic?: string;
  schedule?: string;
  callToAction?: string;
  tone?: string;
};

function normalize(value: string | undefined, fallback: string): string {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function buildSocialAutopublishPrompt(
  input: SocialAutopublishInput
): string {
  const topic = normalize(input.topic, "Weekly operator recap");
  const schedule = normalize(input.schedule, "today 9am local");
  const callToAction = normalize(input.callToAction, "Reply for details");
  const tone = normalize(input.tone, "clear and concise");

  return [
    "Propose mode only.",
    `Draft social posting proposals in this exact order: ${SOCIAL_AUTOPUBLISH_ORDER.join(" -> ")}.`,
    `Topic: ${topic}.`,
    `Schedule hint: ${schedule}.`,
    `Tone: ${tone}.`,
    `CTA: ${callToAction}.`,
    "Output one proposal envelope per channel, keep each as draft, no execution.",
    "If a connector is unavailable, return a safe placeholder proposal and call out the missing lane.",
  ].join(" ");
}

