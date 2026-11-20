import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchLiveCompetitionMeta = vi.hoisted(() => vi.fn());
const fetchLiveRounds = vi.hoisted(() => vi.fn());

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

vi.mock("@/lib/live/wca", () => ({
  fetchLiveCompetitionMeta,
  fetchLiveRounds,
}));

import { GET } from "./route";

function request(competitionId: string) {
  return GET(new NextRequest("http://localhost/api/live/x/rounds"), {
    params: Promise.resolve({ competitionId }),
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchLiveCompetitionMeta.mockReset();
  fetchLiveRounds.mockReset();
  vi.restoreAllMocks();
});

describe("GET /api/live/[competitionId]/rounds", () => {
  it("rejects empty competition ids", async () => {
    const response = await request("");
    expect(response.status).toBe(400);
    expect(fetchLiveRounds).not.toHaveBeenCalled();
  });

  it("returns 404 when the competition is missing", async () => {
    fetchLiveCompetitionMeta.mockResolvedValue(null);
    fetchLiveRounds.mockResolvedValue({ rounds: [] });

    const response = await request("Missing2026");

    expect(response.status).toBe(404);
  });

  it("returns rounds with a short shared cache", async () => {
    fetchLiveCompetitionMeta.mockResolvedValue({
      id: "Foo2026",
      name: "Foo 2026",
      scoretakingSoftware: "internal",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      city: "CDMX",
      venue: "Venue",
    });
    fetchLiveRounds.mockResolvedValue({
      rounds: [{ id: "333-r1", format: "a", state: "open" }],
    });

    const response = await request("Foo2026");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=10, stale-while-revalidate=20",
    );
    expect(body.success).toBe(true);
    expect(body.data.rounds).toHaveLength(1);
    expect(body.data.officialLiveUrl).toContain("/competitions/Foo2026/live");
  });

  it("returns 502 when upstream fails", async () => {
    fetchLiveCompetitionMeta.mockRejectedValue(new Error("upstream"));
    fetchLiveRounds.mockResolvedValue({ rounds: [] });

    const response = await request("Foo2026");

    expect(response.status).toBe(502);
  });
});
