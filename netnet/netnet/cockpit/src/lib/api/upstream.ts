import { jsonErr } from "@/lib/api/errors";

type UpstreamFailure = {
  ok: false;
  status: number;
  error: unknown;
};

type NormalizedUpstream = {
  status: number;
  code: string;
  message: string;
  details: {
    source: string;
    retryable: boolean;
    upstreamStatus: number | null;
    upstreamError?: string;
  };
};

function cleanLine(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 180);
}

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === "string") return cleanLine(error);
  if (!error || typeof error !== "object") return undefined;

  const maybe = error as Record<string, unknown>;
  const direct = maybe.message ?? maybe.error ?? maybe.code;
  if (typeof direct === "string" && direct.trim()) return cleanLine(direct);

  try {
    const text = JSON.stringify(error);
    return text && text !== "{}" ? cleanLine(text) : undefined;
  } catch {
    return undefined;
  }
}

function isAbortLike(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = String((error as Record<string, unknown>).name ?? "").toLowerCase();
  const message = String((error as Record<string, unknown>).message ?? "").toLowerCase();
  return name.includes("abort") || message.includes("abort") || message.includes("timeout");
}

export function normalizeUpstreamError(
  source: string,
  failure: UpstreamFailure,
  fallbackMessage: string
): NormalizedUpstream {
  const upstreamStatus = failure.status > 0 ? failure.status : null;
  const upstreamError = extractErrorMessage(failure.error);

  if (failure.status === 0) {
    const timeout = isAbortLike(failure.error);
    return {
      status: timeout ? 504 : 502,
      code: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
      message: timeout ? "Upstream request timed out." : fallbackMessage,
      details: {
        source,
        retryable: true,
        upstreamStatus,
        ...(upstreamError ? { upstreamError } : {}),
      },
    };
  }

  if (failure.status === 429) {
    return {
      status: 503,
      code: "UPSTREAM_RATE_LIMITED",
      message: "Upstream service is rate limiting requests.",
      details: {
        source,
        retryable: true,
        upstreamStatus,
        ...(upstreamError ? { upstreamError } : {}),
      },
    };
  }

  if (failure.status >= 500) {
    return {
      status: 502,
      code: "UPSTREAM_BAD_GATEWAY",
      message: fallbackMessage,
      details: {
        source,
        retryable: true,
        upstreamStatus,
        ...(upstreamError ? { upstreamError } : {}),
      },
    };
  }

  return {
    status: 502,
    code: "UPSTREAM_REJECTED",
    message: fallbackMessage,
    details: {
      source,
      retryable: false,
      upstreamStatus,
      ...(upstreamError ? { upstreamError } : {}),
    },
  };
}

export function upstreamJsonErr(
  source: string,
  failure: UpstreamFailure,
  fallbackMessage: string
) {
  const normalized = normalizeUpstreamError(source, failure, fallbackMessage);
  return jsonErr(
    normalized.status,
    normalized.code,
    normalized.message,
    normalized.details
  );
}
