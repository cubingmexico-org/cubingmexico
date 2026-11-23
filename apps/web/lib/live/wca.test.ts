import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const wcaFetch = vi.hoisted(() => vi.fn());

vi.mock("@workspace/wca", () => ({
  wcaFetch,
}));

import { fetchLiveRoundDetails, fetchLiveRounds } from "./wca";

afterEach(() => {
  wcaFetch.mockReset();
});

describe("fetchLiveRounds", () => {
  it("returns empty rounds when WCA live is forbidden", async () => {
    wcaFetch.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(
      fetchLiveRounds("CoralitoBahiadeBanderas2026"),
    ).resolves.toEqual({ rounds: [] });
  });

  it("returns empty rounds for missing live data", async () => {
    wcaFetch.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(fetchLiveRounds("Missing2026")).resolves.toEqual({
      rounds: [],
    });
  });

  it("throws on unexpected upstream failures", async () => {
    wcaFetch.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(fetchLiveRounds("Foo2026")).rejects.toThrow(
      "Failed to fetch live rounds for Foo2026: 500",
    );
  });
});

describe("fetchLiveRoundDetails", () => {
  it("returns null when WCA live is forbidden", async () => {
    wcaFetch.mockResolvedValue(new Response(null, { status: 403 }));

    await expect(
      fetchLiveRoundDetails("CoralitoBahiadeBanderas2026", "333-r1"),
    ).resolves.toBeNull();
  });
});
