import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertPerson,
  insertResult,
  insertScopeEvents,
} from "@/test/factories";
import { getPendingRecordPosts } from "./social-pending-events";

beforeEach(async () => {
  await insertScopeEvents();
  await insertPerson({ wcaId: "2020RECO01", stateId: "JAL" });
  await insertCompetition({ id: "RecordOpen2024" });
});

describe("getPendingRecordPosts", () => {
  it("only offers records in official events", async () => {
    await insertResult({
      id: "r333",
      competitionId: "RecordOpen2024",
      eventId: "333",
      personId: "2020RECO01",
      best: 500,
      average: 600,
      regionalSingleRecord: "NR",
      regionalAverageRecord: "NR",
    });
    for (const eventId of ["333ft", "fto"]) {
      await insertResult({
        id: `r${eventId}`,
        competitionId: "RecordOpen2024",
        eventId,
        personId: "2020RECO01",
        best: 3000,
        average: 3500,
        regionalSingleRecord: "NR",
        regionalAverageRecord: "NR",
      });
    }

    const posts = await getPendingRecordPosts(50, { includeOlder: true });

    expect(posts.map((post) => [post.eventId, post.kind]).sort()).toEqual([
      ["333", "average"],
      ["333", "single"],
    ]);
  });
});
