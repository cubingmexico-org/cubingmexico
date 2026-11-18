import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendParticipationEmails } from "./send-participation-emails";

describe("sendParticipationEmails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loops batches and stops on daily quota", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sent: 10,
            failed: [],
            skippedNoEmail: [],
            dailyQuotaHit: false,
            monthlyQuotaHit: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sent: 2,
            failed: [{ registrantId: 13, error: "daily_quota_exceeded" }],
            skippedNoEmail: [],
            dailyQuotaHit: true,
            monthlyQuotaHit: false,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const onProgress = vi.fn();
    const result = await sendParticipationEmails({
      competitionId: "Comp2026",
      registrantIds: Array.from({ length: 15 }, (_, i) => i + 1),
      content: { type: "doc", content: [] },
      pageMargins: [40, 40, 40, 40],
      pageOrientation: "landscape",
      pageSize: "LETTER",
      onProgress,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      sent: 12,
      failed: [{ registrantId: 13, error: "daily_quota_exceeded" }],
      skippedNoEmail: [],
      dailyQuotaHit: true,
      monthlyQuotaHit: false,
    });
    expect(onProgress).toHaveBeenLastCalledWith(15, 15);
  });
});
