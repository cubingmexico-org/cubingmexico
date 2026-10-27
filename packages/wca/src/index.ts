const DEFAULT_WCA_ORIGIN = "https://www.worldcubeassociation.org";

export const WCA_TIMEOUT_MS = 10_000;
const DEFAULT_GET_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5_000;

/**
 * Origin of the WCA site and API. `WCA_ORIGIN` is only set by end-to-end runs,
 * which point it at a fake WCA server.
 */
export function wcaOrigin(): string {
  const origin = process.env.WCA_ORIGIN?.trim() || DEFAULT_WCA_ORIGIN;
  return origin.replace(/\/+$/, "");
}

/** Absolute WCA URL for a path such as `/api/v0/me` or `/oauth/token`. */
export function wcaUrl(path: string): string {
  return `${wcaOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Wait before retry number `attempt` (0-based). Honors `Retry-After` (seconds or
 * an HTTP date) only when the header is present, and never waits longer than 5s
 * so a serverless function can't sleep until its time limit.
 */
export function retryDelayMs(
  attempt: number,
  retryAfter: string | null,
  now: number = Date.now(),
): number {
  const fromHeader = parseRetryAfter(retryAfter, now);
  const delay = fromHeader ?? BASE_RETRY_DELAY_MS * 2 ** attempt;
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function parseRetryAfter(value: string | null, now: number): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export interface WcaFetchInit extends RequestInit {
  /** Per-attempt timeout. Defaults to 10s. */
  timeoutMs?: number;
  /** Retries for GET requests on 429, 5xx and network errors. Defaults to 3; other methods never retry. */
  retries?: number;
}

/**
 * `fetch` for the WCA API and OAuth endpoints, with a timeout on every attempt and
 * retries with backoff for GET requests. Accepts a WCA path or an absolute URL.
 * Returns the last response, so callers still check `response.ok`.
 */
export async function wcaFetch(
  pathOrUrl: string,
  init: WcaFetchInit = {},
): Promise<Response> {
  const { timeoutMs = WCA_TIMEOUT_MS, retries, signal, ...rest } = init;
  const method = (rest.method ?? "GET").toUpperCase();
  const maxRetries = method === "GET" ? (retries ?? DEFAULT_GET_RETRIES) : 0;
  const url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : wcaUrl(pathOrUrl);

  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        ...rest,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      // Timeouts and caller aborts are DOMExceptions and are not retried; network failures are TypeErrors.
      if (attempt >= maxRetries || !(error instanceof TypeError)) {
        throw error;
      }
      await sleep(retryDelayMs(attempt, null));
      continue;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      return response;
    }
    await response.body?.cancel();
    await sleep(retryDelayMs(attempt, response.headers.get("retry-after")));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
