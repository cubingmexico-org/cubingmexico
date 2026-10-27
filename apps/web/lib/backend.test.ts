import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { backendConfig, fetchBackend, postToBackend } =
  await import("./backend");

const fetchMock = vi.fn<typeof fetch>();

function hangUntilAborted(_url: unknown, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BACKEND_URL", "https://backend.example/");
  vi.stubEnv("CRON_SECRET", "s3cret");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchBackend", () => {
  it("turns a timeout into a 504 response", async () => {
    fetchMock.mockImplementation(hangUntilAborted);

    const response = await fetchBackend("https://backend.example/x", {}, 10);

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: "El backend no respondió a tiempo.",
    });
  });

  it("rethrows other network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      fetchBackend("https://backend.example/x", {}, 1000),
    ).rejects.toThrow("fetch failed");
  });
});

describe("backendConfig", () => {
  it("trims the trailing slash", () => {
    expect(backendConfig()).toEqual({
      backendUrl: "https://backend.example",
      cronSecret: "s3cret",
    });
  });

  it("is null when either variable is unset or empty", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(backendConfig()).toBeNull();
  });
});

describe("postToBackend", () => {
  it("doesn't call the backend when it isn't configured", async () => {
    vi.stubEnv("BACKEND_URL", "");

    const response = await postToBackend("/update-all");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a timed-out job as a failed 504", async () => {
    fetchMock.mockImplementation(hangUntilAborted);

    await expect(
      postToBackend("/update-all", { timeoutMs: 10 }),
    ).resolves.toEqual({
      ok: false,
      status: 504,
      body: { error: "El backend no respondió a tiempo." },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://backend.example/update-all",
    );
  });
});
