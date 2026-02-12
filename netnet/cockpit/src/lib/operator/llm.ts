import { getOperatorEngine } from "@/lib/operator/engine";
import { getSkillContextSummary } from "@/lib/operator/skillContext";
import type { MessageEnvelope } from "@/lib/operator/types";

function buildSystemPrompt(): string {
  return [
    "You are the Netnet Operator Assistant.",
    "Stay policy-safe and audit-friendly.",
    "Never execute actions directly.",
    "When suggesting action, prefer returning JSON only in this shape:",
    '{ "type":"skill.proposal", "skillId":"...", "route":"...", "reasoning":"...", "proposedBody":{}, "riskLevel":"low|medium|high" }',
    "If user asks for plain explanation, respond in concise markdown and include no side effects.",
    "Skill registry summary:",
    getSkillContextSummary(),
  ].join("\n");
}

export async function generateAssistantReply(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
  const engine = getOperatorEngine();
  const promptMessage: MessageEnvelope = {
    id: "system_prompt",
    role: "system",
    content: buildSystemPrompt(),
    createdAt: Date.now(),
  };

  const input = [
    promptMessage,
    ...messages.filter((message) => message.role === "system" || message.role === "operator" || message.role === "assistant"),
  ];

  return engine.generate(input);
}

