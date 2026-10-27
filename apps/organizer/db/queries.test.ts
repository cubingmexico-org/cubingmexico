import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureException = vi.fn();
const dbSelect = vi.fn();

vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: dbSelect }) }),
  },
}));

const {
  getCompetitionById,
  getCompetitionLogosByIds,
  getCompetitionsManagedByUser,
  getWCIFByCompetitionId,
} = await import("./queries");

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("WCA_ORIGIN", "http://wca.test");
});

afterEach(() => {
  fetchMock.mockReset();
  captureException.mockReset();
  dbSelect.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getCompetitionsManagedByUser", () => {
  it("skips the WCA call without a token", async () => {
    await expect(
      getCompetitionsManagedByUser({ token: undefined }),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the managed competitions", async () => {
    fetchMock.mockResolvedValue(json(200, [{ id: "Comp2026" }]));

    await expect(getCompetitionsManagedByUser({ token: "t" })).resolves.toEqual(
      [{ id: "Comp2026" }],
    );
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://wca.test/api/v0/competitions?managed_by_me=true");
    expect(init?.headers).toEqual({ Authorization: "Bearer t" });
  });

  it("throws instead of returning an empty list when the WCA fails", async () => {
    fetchMock.mockResolvedValue(json(401));

    await expect(getCompetitionsManagedByUser({ token: "t" })).rejects.toThrow(
      "WCA API responded 401",
    );
  });
});

describe("getCompetitionById", () => {
  it("returns undefined for a missing competition", async () => {
    fetchMock.mockResolvedValue(json(404));

    await expect(getCompetitionById({ id: "Nope2026" })).resolves.toBe(
      undefined,
    );
  });

  it("throws on other failures", async () => {
    fetchMock.mockResolvedValue(json(400));

    await expect(getCompetitionById({ id: "Comp2026" })).rejects.toThrow(
      "WCA API responded 400 for competition Comp2026",
    );
  });
});

describe("getWCIFByCompetitionId", () => {
  it.each([401, 403, 404])(
    "returns undefined when the WCIF is unavailable (%i)",
    async (status) => {
      fetchMock.mockResolvedValue(json(status));

      await expect(
        getWCIFByCompetitionId({ competitionId: "Comp2026" }),
      ).resolves.toBe(undefined);
    },
  );

  it("throws on a non-retryable failure", async () => {
    fetchMock.mockResolvedValue(json(422));

    await expect(
      getWCIFByCompetitionId({ competitionId: "Comp2026" }),
    ).rejects.toThrow("WCA API responded 422");
  });
});

describe("getCompetitionLogosByIds", () => {
  it("falls back to no logos and reports the failure", async () => {
    const error = new Error("db down");
    dbSelect.mockRejectedValue(error);

    const logos = await getCompetitionLogosByIds(["A2026", "B2026"]);

    expect([...logos]).toEqual([
      ["A2026", null],
      ["B2026", null],
    ]);
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
