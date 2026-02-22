import { NextRequest, NextResponse } from "next/server";
import { generateAssistantReply } from "@/lib/operator/llm";
import { extractSkillProposalEnvelope } from "@/lib/operator/proposal";
import { getPolicy } from "@/lib/policy/store";
import {
  appendAuditMessage,
  appendMessage,
  ensureStrategyForProposal,
  listMessages,
  upsertProposal,
} from "@/lib/operator/store";
import { sendTelegramMessage } from "@/lib/operator/telegram";
import { processRegenComputeOffset } from "@/lib/operator/regenCompute";

export const dynamic = "force-dynamic";

type TelegramActor = {
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  text?: string;
  chat?: { id?: string | number };
  from?: TelegramActor;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type ParsedTelegramMessage = {
  chatId: string;
  text: string;
  sender: string;
};

function policySnapshot(): Record<string, unknown> {
  const policy = getPolicy();
  return {
    autonomy: policy.autonomy,
    maxUsdPerDay: policy.maxUsdPerDay,
    maxUsdPerAction: policy.maxUsdPerAction,
    kill: policy.kill,
    updatedAt: policy.updatedAt,
  };
}

function parseTelegramUpdate(body: unknown): ParsedTelegramMessage | null {
  if (!body || typeof body !== "object") return null;
  const update = body as TelegramUpdate;
  const message = update.message || update.edited_message;
  if (!message) return null;

  const text = String(message.text || "").trim();
  const chatIdRaw = message.chat?.id;
  const chatId = chatIdRaw === undefined ? "" : String(chatIdRaw).trim();
  if (!text || !chatId) return null;

  const actor = message.from || {};
  const username = String(actor.username || "").trim();
  const fullName = `${String(actor.first_name || "").trim()} ${String(
    actor.last_name || ""
  ).trim()}`.trim();
  const sender = username ? `@${username}` : fullName || "telegram_user";
  return { chatId, text, sender };
}

function shouldBlockExecutionInstructions(content: string): boolean {
  const normalized = content.toLowerCase();
  return (
    normalized.includes("execute now") ||
    normalized.includes("run now") ||
    normalized.includes("lock intent") ||
    normalized.includes("request intent") ||
    normalized.includes("approve and execute") ||
    normalized.includes("auto-execute")
  );
}

function clampTelegramText(input: string): string {
  const text = String(input || "").trim();
  if (!text) return "No response generated.";
  const max = 3900;
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}

export async function POST(req: NextRequest) {
  const expectedSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const providedSecret = String(req.nextUrl.searchParams.get("secret") || "").trim();
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const incoming = parseTelegramUpdate(body);
  if (!incoming) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  appendMessage({
    role: "operator",
    content: `${incoming.sender}: ${incoming.text}`,
    metadata: {
      action: "analysis",
      source: "telegram",
      chatId: incoming.chatId,
      mode: "propose_only",
      tags: ["telegram", "operator-input"],
      policySnapshot: policySnapshot(),
    },
  });

  let telegramReply = "";
  try {
    const assistant = await generateAssistantReply(listMessages());
    const usage = assistant.metadata?.llmUsage;
    const offset = await processRegenComputeOffset({
      usage,
      source: "telegram",
      messageId: assistant.id,
      operatorRef: incoming.sender,
    });
    const proposal = extractSkillProposalEnvelope(assistant.content);
    const blockExecution = shouldBlockExecutionInstructions(assistant.content);

    if (proposal) {
      upsertProposal(proposal);
      ensureStrategyForProposal(proposal);

      const assistantContent = blockExecution
        ? "Execution requires Operator UI approval."
        : assistant.content;
      appendMessage({
        role: "assistant",
        content: assistantContent,
        metadata: {
          action: "proposal",
          proposalId: proposal.id,
          proposal,
          source: "telegram",
          chatId: incoming.chatId,
          mode: "propose_only",
          rawAssistantContent: assistant.content,
          tags: ["telegram", "proposal", proposal.riskLevel],
          policySnapshot: policySnapshot(),
          llmUsage: usage,
          proofId: offset.proof?.id,
        },
      });

      telegramReply = blockExecution
        ? "Execution requires Operator UI approval."
        : `Draft proposal created: ${proposal.id}\nReview and approve in Operator UI.`;
    } else {
      const assistantContent = blockExecution
        ? "Execution requires Operator UI approval."
        : assistant.content;
      appendMessage({
        role: "assistant",
        content: assistantContent,
        metadata: {
          action: "analysis",
          source: "telegram",
          chatId: incoming.chatId,
          mode: "propose_only",
          rawAssistantContent: assistant.content,
          tags: ["telegram", "assistant"],
          policySnapshot: policySnapshot(),
          llmUsage: usage,
          proofId: offset.proof?.id,
        },
      });
      telegramReply = assistantContent;
    }

    if (offset.enabled) {
      if (offset.attemptedRetire && offset.retirement?.success) {
        appendAuditMessage(
          `Telegram regen compute offset retired: ${offset.retirement.retirementId || "ok"}${offset.proof?.id ? ` (proof ${offset.proof.id})` : ""}`,
          "regen.compute.offset.retired"
        );
      } else if (offset.attemptedRetire && !offset.retirement?.success) {
        appendAuditMessage(
          `Telegram regen compute offset failed: ${offset.retirement?.error || "unknown_error"}`,
          "regen.compute.offset.error"
        );
      } else if (offset.estimate) {
        appendAuditMessage(
          `Telegram regen compute estimate logged: ${offset.estimate.totalTokens} tokens${offset.proof?.id ? ` (proof ${offset.proof.id})` : ""}`,
          "regen.compute.offset.estimate"
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendAuditMessage(`Telegram assistant generation failed: ${message}`, "telegram.error");
    telegramReply = "I couldn't process that. Please retry from Operator UI.";
  }

  try {
    await sendTelegramMessage(incoming.chatId, clampTelegramText(telegramReply));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendAuditMessage(`Telegram send failed: ${message}`, "telegram.error");
    return NextResponse.json({ ok: false, error: "telegram_send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
