import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchLiveCompetitionMeta = vi.hoisted(() => vi.fn());
const fetchLiveRoundDetails = vi.hoisted(() => vi.fn());
const enrichLiveRoundDetails = vi.hoisted(() => vi.fn());

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

vi.mock("@/lib/live/wca", () => ({
  fetchLiveCompetitionMeta,
  fetchLiveRoundDetails,
}));

vi.mock("@/lib/live/enrich", () => ({
  enrichLiveRoundDetails,
}));

import { GET } from "./route";

function request(competitionId: string, roundId: string) {
  return GET(new NextRequest("http://localhost/api/live/x/rounds/y"), {
    params: Promise.resolve({ competitionId, roundId }),
  });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchLiveCompetitionMeta.mockReset();
  fetchLiveRoundDetails.mockReset();
  enrichLiveRoundDetails.mockReset();
  vi.restoreAllMocks();
});

describe("GET /api/live/[competitionId]/rounds/[roundId]", () => {
  it("returns enriched round details with a short cache", async () => {
    fetchLiveCompetitionMeta.mockResolvedValue({
      id: "Foo2026",
      name: "Foo 2026",
      scoretakingSoftware: "internal",
      startDate: null,
      endDate: null,
      city: null,
      venue: null,
    });
    fetchLiveRoundDetails.mockResolvedValue({
      id: "333-r1",
      format: "a",
      state: "open",
      round_id: 1,
      competitors: [],
      results: [],
    });
    enrichLiveRoundDetails.mockImplementation(async (round, meta) => ({
      ...round,
      competitors: [],
      results: (round.results ?? []).map(
        (result: {
          result_id: number;
          single_record_tag: string | null;
          average_record_tag: string | null;
        }) => ({
          ...result,
          stateSingleRecord: null,
          stateAverageRecord: null,
        }),
      ),
      competitionName: meta.competitionName,
      scoretakingSoftware: meta.scoretakingSoftware,
    }));

    const response = await request("Foo2026", "333-r1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=10, stale-while-revalidate=20",
    );
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("333-r1");
    expect(body.data.competitionName).toBe("Foo 2026");
  });

  it("returns 404 when the round is missing", async () => {
    fetchLiveCompetitionMeta.mockResolvedValue({
      id: "Foo2026",
      name: "Foo 2026",
      scoretakingSoftware: "internal",
      startDate: null,
      endDate: null,
      city: null,
      venue: null,
    });
    fetchLiveRoundDetails.mockResolvedValue(null);

    const response = await request("Foo2026", "333-r9");

    expect(response.status).toBe(404);
  });
});
