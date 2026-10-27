import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryDelayMs, wcaFetch, wcaOrigin, wcaUrl } from "./index";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : "{}", { status, headers });
}

describe("wcaOrigin and wcaUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the WCA site", () => {
    vi.stubEnv("WCA_ORIGIN", "");
    expect(wcaOrigin()).toBe("https://www.worldcubeassociation.org");
    expect(wcaUrl("/api/v0/me")).toBe(
      "https://www.worldcubeassociation.org/api/v0/me",
    );
  });

  it("uses WCA_ORIGIN without its trailing slash", () => {
    vi.stubEnv("WCA_ORIGIN", "http://localhost:4010/");
    expect(wcaUrl("oauth/token")).toBe("http://localhost:4010/oauth/token");
  });
});

describe("retryDelayMs", () => {
  it("backs off exponentially when there is no Retry-After header", () => {
    expect(retryDelayMs(0, null)).toBe(500);
    expect(retryDelayMs(1, null)).toBe(1000);
    expect(retryDelayMs(2, null)).toBe(2000);
    expect(retryDelayMs(0, "")).toBe(500);
  });

  it("honors Retry-After in seconds", () => {
    expect(retryDelayMs(0, "2")).toBe(2000);
    expect(retryDelayMs(2, "0")).toBe(0);
  });

  it("honors Retry-After as an HTTP date", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(retryDelayMs(0, "Thu, 01 Jan 2026 00:00:03 GMT", now)).toBe(3000);
  });

  it("caps long waits at 5 seconds", () => {
    expect(retryDelayMs(0, "3600")).toBe(5000);
    expect(retryDelayMs(10, null)).toBe(5000);
  });

  it("falls back to backoff for an unparseable header", () => {
    expect(retryDelayMs(1, "soon")).toBe(1000);
  });
});

describe("wcaFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("WCA_ORIGIN", "");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("resolves paths against the WCA origin and passes init through", async () => {
    fetchMock.mockResolvedValue(response(200));

    await wcaFetch("/api/v0/me", { headers: { Authorization: "Bearer t" } });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://www.worldcubeassociation.org/api/v0/me");
    expect(init?.headers).toEqual({ Authorization: "Bearer t" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("waits between retries even without a Retry-After header", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200));

    const pending = wcaFetch("/api/v0/competitions/X");

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((await pending).status).toBe(200);
  });

  it("returns the last response once retries run out", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(response(500));

    const pending = wcaFetch("/api/v0/competitions/X", { retries: 2 });
    await vi.advanceTimersByTimeAsync(10_000);

    expect((await pending).status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry 404s", async () => {
    fetchMock.mockResolvedValue(response(404));

    expect((await wcaFetch("/api/v0/persons/X")).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["PATCH", "PUT", "POST"])(
    "never retries %s requests",
    async (method) => {
      fetchMock.mockResolvedValue(response(503));

      const result = await wcaFetch("/api/v0/competitions/X/wcif", {
        method,
        retries: 3,
      });

      expect(result.status).toBe(503);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("retries network errors", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(response(200));

    const pending = wcaFetch("/api/v0/me");
    await vi.advanceTimersByTimeAsync(500);

    expect((await pending).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a slow request and does not retry the timeout", async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    await expect(wcaFetch("/api/v0/me", { timeoutMs: 20 })).rejects.toThrow(
      /timeout|aborted/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts when the caller's signal aborts", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const pending = wcaFetch("/api/v0/me", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow(/abort/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
