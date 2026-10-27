import "server-only";
import { serverEnv } from "@/lib/env";

export type BackendResponse = {
  ok: boolean;
  status: number;
  body: unknown;
};

/** Just under the 300s `maxDuration` of the ops route, so the function can still answer. */
const DEFAULT_BACKEND_TIMEOUT_MS = 280_000;

/**
 * `fetch` to the Flask backend that gives up after `timeoutMs`. Keep it below the
 * calling route's `maxDuration`. A timeout comes back as a 504 response, so callers
 * handle it like any other backend error.
 */
export async function fetchBackend(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return Response.json(
        { error: "El backend no respondió a tiempo." },
        { status: 504 },
      );
    }
    throw error;
  }
}

/** `BACKEND_URL` (without a trailing slash) and `CRON_SECRET`, or null when either is unset. */
export function backendConfig(): {
  backendUrl: string;
  cronSecret: string;
} | null {
  const { BACKEND_URL, CRON_SECRET } = serverEnv();
  if (!BACKEND_URL || !CRON_SECRET) return null;
  return {
    backendUrl: BACKEND_URL.replace(/\/$/, ""),
    cronSecret: CRON_SECRET,
  };
}

/** POSTs to a cron-protected route of the Flask backend (`BACKEND_URL`) with `CRON_SECRET`. */
export async function postToBackend(
  path: string,
  { timeoutMs = DEFAULT_BACKEND_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<BackendResponse> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetchBackend(
    `${config.backendUrl}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
        "Content-Type": "application/json",
      },
    },
    timeoutMs,
  );

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

export function backendErrorMessage(response: BackendResponse): string {
  const body = response.body as { message?: unknown; error?: unknown } | null;
  const message = body?.message ?? body?.error;
  return typeof message === "string"
    ? message
    : `Backend error (HTTP ${response.status})`;
}
