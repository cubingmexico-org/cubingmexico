import "server-only";
import { db } from "@workspace/db";
import { ccPerson, ccResult, ccResultPerson } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { CcEventFormat, CcEventResultsGroup } from "@/lib/cubing-contests";
import {
  getCcResultRows,
  groupCcResultsByEvent,
} from "@/lib/cubing-contests-queries";
import {
  getCcEventRanking,
  getCcRankingEvents,
} from "@/app/(root)/unofficial/_lib/queries";
import type { CcRankingRow } from "@/app/(root)/unofficial/_lib/ranking";

function personResultIds(wcaId: string) {
  return db
    .select({ resultId: ccResultPerson.resultId })
    .from(ccResultPerson)
    .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
    .where(eq(ccPerson.wcaId, wcaId));
}

export async function hasPersonUnofficialResults(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const rows = await personResultIds(wcaId).limit(1);
  return rows.length > 0;
}

/** Every unofficial result of the person, grouped by event, newest first within each event. */
export async function getPersonUnofficialResults(
  wcaId: string,
): Promise<CcEventResultsGroup[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const rows = await getCcResultRows(
    inArray(ccResult.id, personResultIds(wcaId)),
  );
  return groupCcResultsByEvent(rows).map((group) => ({
    ...group,
    results: group.results
      .slice()
      .sort(
        (a, b) =>
          b.date.getTime() - a.date.getTime() || b.roundNumber - a.roundNumber,
      ),
  }));
}

export interface PersonUnofficialPr {
  eventId: string;
  eventName: string;
  eventFormat: CcEventFormat;
  single: { value: number; countryRank: number } | null;
  average: { value: number; countryRank: number } | null;
}

/**
 * The person's best unofficial single and average per event, with their
 * national rank. For team events these are the person's best team's.
 */
export async function getPersonUnofficialPrs(
  wcaId: string,
): Promise<PersonUnofficialPr[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const [eventRows, events] = await Promise.all([
    db
      .select({ eventId: ccResult.eventId })
      .from(ccResult)
      .where(inArray(ccResult.id, personResultIds(wcaId)))
      .groupBy(ccResult.eventId),
    getCcRankingEvents(),
  ]);
  const personEventIds = new Set(eventRows.map((row) => row.eventId));

  const prs = await Promise.all(
    events
      .filter((event) => personEventIds.has(event.id))
      .map(async (event) => {
        const [singles, averages] = await Promise.all([
          getCcEventRanking(event.id, "single"),
          getCcEventRanking(event.id, "average"),
        ]);
        const best = (rows: CcRankingRow[]) => {
          const row = rows.find((candidate) =>
            candidate.competitors.some(
              (competitor) => competitor.wcaId === wcaId,
            ),
          );
          return row
            ? { value: row.value, countryRank: row.countryRank }
            : null;
        };
        return {
          eventId: event.id,
          eventName: event.name,
          eventFormat: event.format,
          single: best(singles),
          average: best(averages),
        };
      }),
  );
  return prs.filter((pr) => pr.single || pr.average);
}
