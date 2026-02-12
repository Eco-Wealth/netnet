import type { MessageEnvelope } from "@/lib/operator/model";
import { getOperatorEngine } from "@/lib/operator/engine";

// Execution boundary guard:
// This module must only delegate to the deterministic operator engine layer.
// It must not import executor/db/store or trigger side effects.
function assertAssistantEnvelope(envelope: MessageEnvelope): MessageEnvelope {
  if (envelope.role !== "assistant") {
    throw new Error("invalid_operator_reply_role");
  }
  const action = envelope.metadata?.action;
  if (action && action !== "analysis" && action !== "proposal") {
    throw new Error("invalid_operator_reply_action");
  }
  if (action !== "proposal" && envelope.metadata?.proposal) {
    throw new Error("llm_isolation_violation");
  }
  return envelope;
}

export async function generateAssistantReply(
  messages: MessageEnvelope[]
): Promise<MessageEnvelope> {
  const engine = getOperatorEngine();
  const reply = await engine.generate(messages);
  return assertAssistantEnvelope(reply);
}
