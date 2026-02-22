export type PrivyTransaction = {
  to: string;
  data?: string;
  value?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export type SendPrivyTransactionInput = {
  walletId: string;
  chainCaip2: string;
  transaction: PrivyTransaction;
};

export type SendPrivyTransactionResult =
  | {
      ok: true;
      hash: string;
      raw: unknown;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      raw?: unknown;
    };

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

function basicAuthHeader(appId: string, appSecret: string): string {
  const token = Buffer.from(`${appId}:${appSecret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function extractTxHash(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.hash === "string") return record.hash;
  if (typeof record.result === "string") return record.result;
  const data = record.data;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    if (typeof dataRecord.hash === "string") return dataRecord.hash;
    if (typeof dataRecord.result === "string") return dataRecord.result;
  }
  return "";
}

export async function sendPrivyTransaction(
  input: SendPrivyTransactionInput
): Promise<SendPrivyTransactionResult> {
  const appId = env("PRIVY_APP_ID");
  const appSecret = env("PRIVY_APP_SECRET");
  if (!appId || !appSecret) {
    return {
      ok: false,
      error: "privy_credentials_missing",
    };
  }

  const endpoint = `https://api.privy.io/v1/wallets/${encodeURIComponent(
    input.walletId
  )}/rpc`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "privy-app-id": appId,
        authorization: basicAuthHeader(appId, appSecret),
      },
      cache: "no-store",
      body: JSON.stringify({
        method: "eth_sendTransaction",
        chain_type: "ethereum",
        caip2: input.chainCaip2,
        params: {
          transaction: input.transaction,
        },
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "privy_request_failed",
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: "privy_http_error",
      status: response.status,
      raw: payload,
    };
  }

  const txHash = extractTxHash(payload);
  if (!txHash) {
    return {
      ok: false,
      error: "privy_missing_tx_hash",
      raw: payload,
    };
  }

  return {
    ok: true,
    hash: txHash,
    raw: payload,
  };
}
