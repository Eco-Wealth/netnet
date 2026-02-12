import type { MessageEnvelope } from "@/lib/operator/model";
import { getSkillContextSummary } from "@/lib/operator/skillContext";
import {
  parseSkillProposalEnvelopeFromContent,
  stringifySkillProposalEnvelope,
  type SkillProposalEnvelope,
} from "@/lib/operator/proposal";

type EngineChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OperatorEngine = {
  generate(messages: MessageEnvelope[]): Promise<MessageEnvelope>;
};

function hashText(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildDeterministicId(history: MessageEnvelope[], content: string): string {
  const seed = history.map((m) => `${m.role}:${m.id}:${m.content}`).join("\n");
  const h1 = hashText(seed);
  const h2 = hashText(content);
  return `asst-${h1}-${h2}`;
}

// Execution boundary guard:
// Engine output must stay analysis/proposal only. No execution calls.
function assertIsolation(
  action: "analysis" | "proposal",
  proposal: SkillProposalEnvelope | null
) {
  if (proposal && action !== "proposal") {
    throw new Error("llm_isolation_violation");
  }
}

async function buildPromptMessages(
  history: MessageEnvelope[]
): Promise<EngineChatMessage[]> {
  const conversation = history
    .filter(
      (m) =>
        m.role === "system" || m.role === "operator" || m.role === "assistant"
    )
    .map((m): EngineChatMessage => {
      if (m.role === "system") return { role: "system", content: m.content };
      if (m.role === "assistant") return { role: "assistant", content: m.content };
      return { role: "user", content: m.content };
    });

  const skillSummary = await getSkillContextSummary();
  const guardrail: EngineChatMessage = {
    role: "system",
    content: [
      "You are netnet operator assistant in strict READ_ONLY mode.",
      "No route calls, no tool calls, no side effects, and no execution guidance.",
      "You may only provide analysis and suggestions.",
      "When suggesting a skill, return ONLY JSON with this exact structure:",
      '{"type":"skill.proposal","skillId":"...","route":"...","reasoning":"...","proposedBody":{},"riskLevel":"low|medium|high"}',
      "If no skill suggestion is needed, return concise plain-text analysis.",
      "Never imply any action was executed.",
      skillSummary,
    ].join(" "),
  };

  return [guardrail, ...conversation];
}

function fallbackReply(
  history: MessageEnvelope[],
  reason: "no_api_key" | "request_failed" | "no_local_endpoint"
): MessageEnvelope {
  const content =
    reason === "no_api_key"
      ? "OPENROUTER_API_KEY is not set. Staying in READ_ONLY mode with local assistant fallback."
      : reason === "no_local_endpoint"
      ? "LOCAL_LLM_ENDPOINT is not set. Staying in READ_ONLY mode with local assistant fallback."
      : "Model request failed. Staying in READ_ONLY mode with local assistant fallback.";
  return {
    id: buildDeterministicId(history, content),
    role: "assistant",
    content,
    createdAt: Date.now(),
    metadata: {
      action: "analysis",
    },
  };
}

function toAssistantEnvelope(
  history: MessageEnvelope[],
  rawContent: string
): MessageEnvelope {
  const proposal = parseSkillProposalEnvelopeFromContent(rawContent);
  const content = proposal
    ? stringifySkillProposalEnvelope(proposal)
    : rawContent || "No assistant content returned.";
  const action: "analysis" | "proposal" = proposal ? "proposal" : "analysis";
  assertIsolation(action, proposal);
  return {
    id: buildDeterministicId(history, content),
    role: "assistant",
    content,
    createdAt: Date.now(),
    metadata: {
      action,
      proposal: action === "proposal" ? proposal ?? undefined : undefined,
    },
  };
}

function extractContentFromResponse(json: unknown): string {
  const payload = (json ?? {}) as Record<string, any>;
  const byChoices = String(payload?.choices?.[0]?.message?.content ?? "").trim();
  if (byChoices) return byChoices;
  const byMessage = String(payload?.message?.content ?? "").trim();
  if (byMessage) return byMessage;
  const byOutput = String(payload?.output ?? payload?.content ?? "").trim();
  if (byOutput) return byOutput;
  return "";
}

class OpenRouterEngine implements OperatorEngine {
  async generate(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("OPENROUTER_API_KEY missing in production");
      }
      return fallbackReply(messages, "no_api_key");
    }

    const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
    const promptMessages = await buildPromptMessages(messages);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: promptMessages,
          temperature: 0.2,
        }),
        cache: "no-store",
      });

      const json = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) return fallbackReply(messages, "request_failed");
      const content = extractContentFromResponse(json);
      return toAssistantEnvelope(messages, content);
    } catch {
      return fallbackReply(messages, "request_failed");
    }
  }
}

class LocalHttpEngine implements OperatorEngine {
  async generate(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const endpoint = process.env.LOCAL_LLM_ENDPOINT?.trim();
    if (!endpoint) return fallbackReply(messages, "no_local_endpoint");

    const promptMessages = await buildPromptMessages(messages);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: promptMessages }),
        cache: "no-store",
      });
      const json = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) return fallbackReply(messages, "request_failed");
      const content = extractContentFromResponse(json);
      return toAssistantEnvelope(messages, content);
    } catch {
      return fallbackReply(messages, "request_failed");
    }
  }
}

export function getOperatorEngine(): OperatorEngine {
  const mode = (process.env.OPERATOR_ENGINE?.trim().toLowerCase() || "openrouter") as
    | "openrouter"
    | "local";
  return mode === "local" ? new LocalHttpEngine() : new OpenRouterEngine();
}
