import type { MessageEnvelope, MessageMetadata } from "@/lib/operator/types";
import { createMessageId } from "@/lib/operator/types";

export type OperatorEngine = {
  generate(messages: MessageEnvelope[]): Promise<MessageEnvelope>;
};

type EngineMessage = { role: "system" | "user" | "assistant"; content: string };

function toEngineMessages(messages: MessageEnvelope[]): EngineMessage[] {
  return messages.reduce<EngineMessage[]>((acc, message) => {
    if (message.role === "system" || message.role === "assistant") {
      acc.push({ role: message.role, content: message.content });
      return acc;
    }
    if (message.role === "operator") {
      acc.push({ role: "user", content: message.content });
    }
    return acc;
  }, []);
}

function fallbackAssistant(content: string): MessageEnvelope {
  return {
    id: createMessageId("assistant"),
    role: "assistant",
    content,
    createdAt: Date.now(),
  };
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function usageMetadataFromOpenRouter(data: any, model: string): MessageMetadata["llmUsage"] | undefined {
  const usage = data?.usage;
  if (!usage || typeof usage !== "object") return undefined;
  const promptTokens = toNumber(usage.prompt_tokens);
  const completionTokens = toNumber(usage.completion_tokens);
  const totalTokens = toNumber(usage.total_tokens);
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return {
    provider: "openrouter",
    model,
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

function usageMetadataFromLocal(data: any): MessageMetadata["llmUsage"] | undefined {
  const usage =
    data?.usage && typeof data.usage === "object"
      ? data.usage
      : data?.metrics && typeof data.metrics === "object"
      ? data.metrics
      : null;
  if (!usage) return undefined;
  const promptTokens = toNumber(usage.prompt_tokens ?? usage.promptTokens);
  const completionTokens = toNumber(
    usage.completion_tokens ?? usage.completionTokens
  );
  const totalTokens = toNumber(usage.total_tokens ?? usage.totalTokens);
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return {
    provider: "local",
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

class OpenRouterEngine implements OperatorEngine {
  async generate(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return fallbackAssistant(
        "OpenRouter key is not set. I can still help by drafting proposal JSON if you provide a target skill."
      );
    }

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: toEngineMessages(messages),
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!response.ok || typeof content !== "string" || !content.trim()) {
      return fallbackAssistant("The language model returned an empty response. Please retry with a specific skill goal.");
    }

    return {
      id: createMessageId("assistant"),
      role: "assistant",
      content: content.trim(),
      createdAt: Date.now(),
      metadata: {
        llmUsage: usageMetadataFromOpenRouter(data, model),
      },
    };
  }
}

class LocalHttpEngine implements OperatorEngine {
  async generate(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const endpoint = process.env.LOCAL_LLM_ENDPOINT || "http://localhost:11434/api/chat";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: toEngineMessages(messages) }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as any;
    const content =
      data?.message?.content || data?.output || data?.response || data?.choices?.[0]?.message?.content;

    if (!response.ok || typeof content !== "string" || !content.trim()) {
      return fallbackAssistant("Local model endpoint did not return a valid assistant message.");
    }

    return {
      id: createMessageId("assistant"),
      role: "assistant",
      content: content.trim(),
      createdAt: Date.now(),
      metadata: {
        llmUsage: usageMetadataFromLocal(data),
      },
    };
  }
}

export function getOperatorEngine(): OperatorEngine {
  const mode = process.env.OPERATOR_ENGINE || "openrouter";
  if (mode === "local") return new LocalHttpEngine();
  return new OpenRouterEngine();
}
