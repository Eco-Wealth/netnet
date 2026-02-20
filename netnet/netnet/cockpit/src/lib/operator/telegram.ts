function requireTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !token.trim()) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
  return token.trim();
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = requireTelegramToken();
  const targetChat = String(chatId || "").trim();
  if (!targetChat) {
    throw new Error("chatId is required.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: targetChat,
      text: String(text || ""),
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description || `Telegram sendMessage failed (${response.status}).`);
  }
}
