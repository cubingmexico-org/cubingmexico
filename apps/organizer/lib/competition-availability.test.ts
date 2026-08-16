import { describe, expect, it } from "vitest";
import { isCompetitionToolsUnavailable } from "./competition-availability";

describe("isCompetitionToolsUnavailable", () => {
  const now = new Date("2026-08-15T12:00:00.000Z");

  it("is unavailable when not announced", () => {
    expect(
      isCompetitionToolsUnavailable(
        { announced_at: null, results_posted_at: null },
        now,
      ),
    ).toBe(true);
  });

  it("is available when announced and results not posted", () => {
    expect(
      isCompetitionToolsUnavailable(
        {
          announced_at: "2026-07-01T00:00:00.000Z",
          results_posted_at: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("is available within one month of results posted", () => {
    expect(
      isCompetitionToolsUnavailable(
        {
          announced_at: "2026-07-01T00:00:00.000Z",
          results_posted_at: "2026-08-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("is unavailable more than one month after results posted", () => {
    expect(
      isCompetitionToolsUnavailable(
        {
          announced_at: "2026-05-01T00:00:00.000Z",
          results_posted_at: "2026-06-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });
});
