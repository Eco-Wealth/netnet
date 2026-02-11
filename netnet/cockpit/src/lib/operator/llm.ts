import type { MessageEnvelope } from "@/lib/operator/model";

type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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

function fallbackReply(reason: string, history: MessageEnvelope[]): MessageEnvelope {
  const content =
    reason === "no_api_key"
      ? "OPENROUTER_API_KEY is not set. Staying in READ_ONLY mode with local assistant fallback."
      : "OpenRouter request failed. Staying in READ_ONLY mode with local assistant fallback.";
  return {
    id: buildDeterministicId(history, content),
    role: "assistant",
    content,
    createdAt: Date.now(),
    metadata: {
      action: "assistant.local_fallback",
    },
  };
}

function toOpenRouterMessages(history: MessageEnvelope[]): OpenRouterChatMessage[] {
  const conversation = history
    .filter(
      (m) =>
        m.role === "system" || m.role === "operator" || m.role === "assistant"
    )
    .map((m): OpenRouterChatMessage => {
      if (m.role === "system") return { role: "system", content: m.content };
      if (m.role === "assistant") return { role: "assistant", content: m.content };
      return { role: "user", content: m.content };
    });

  const guardrail: OpenRouterChatMessage = {
    role: "system",
    content: [
      "You are netnet operator assistant in strict READ_ONLY mode.",
      "Do not call tools, do not propose execution steps, do not claim actions were run.",
      "Provide concise planning guidance only.",
    ].join(" "),
  };

  return [guardrail, ...conversation];
}

export async function generateAssistantReply(
  messages: MessageEnvelope[]
): Promise<MessageEnvelope> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return fallbackReply("no_api_key", messages);

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const payload = {
    model,
    messages: toOpenRouterMessages(messages),
    temperature: 0.2,
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = (await response.json().catch(() => ({}))) as any;
    if (!response.ok) {
      return fallbackReply("request_failed", messages);
    }

    const raw = String(json?.choices?.[0]?.message?.content ?? "").trim();
    const content = raw || "No assistant content returned.";
    return {
      id: buildDeterministicId(messages, content),
      role: "assistant",
      content,
      createdAt: Date.now(),
      metadata: {
        action: "assistant.openrouter.reply",
      },
    };
  } catch {
    return fallbackReply("request_failed", messages);
  }
}

