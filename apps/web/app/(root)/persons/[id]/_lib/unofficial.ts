import "server-only";
import { db } from "@workspace/db";
import {
  ccPerson,
  ccResult,
  ccResultPerson,
  person,
  state,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  summarizeCcYear,
  type CcEventFormat,
  type CcEventResultsGroup,
} from "@/lib/cubing-contests";
import {
  getCcRecordMarkers,
  getCcResultRows,
  getCcResultsSummary,
  groupCcResultsByEvent,
} from "@/lib/cubing-contests-queries";
import {
  getCcEventRanking,
  getCcRankingEvents,
} from "@/app/(root)/unofficial/_lib/queries";
import {
  filterCcRanking,
  type CcRankingRow,
} from "@/app/(root)/unofficial/_lib/ranking";

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

export interface PersonUnofficialHonors {
  medals: { gold: number; silver: number; bronze: number };
  /** Singles and averages are counted separately. */
  records: { unr: number; usr: number };
}

/** All-time unofficial medals (top 3 in finals) and UNR/USR counts. */
export async function getPersonUnofficialHonors(
  wcaId: string,
): Promise<PersonUnofficialHonors> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const [summary, ids, { markers }] = await Promise.all([
    getCcResultsSummary(personResultIds(wcaId)),
    personResultIds(wcaId),
    getCcRecordMarkers(),
  ]);

  const records = { unr: 0, usr: 0 };
  for (const { resultId } of ids) {
    const marker = markers[resultId];
    for (const value of [marker?.single, marker?.average]) {
      if (value === "UNR") records.unr++;
      else if (value === "USR") records.usr++;
    }
  }
  return { medals: summary.podiums, records };
}

export interface PersonUnofficialPodiumsByEvent {
  eventId: string;
  eventName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

/** Unofficial medals per event, for events with at least one. */
export async function getPersonUnofficialPodiumsByEvent(
  wcaId: string,
): Promise<PersonUnofficialPodiumsByEvent[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const rows = await getCcResultRows(
    inArray(ccResult.id, personResultIds(wcaId)),
  );
  return groupCcResultsByEvent(rows)
    .map((group) => {
      const { podiums } = summarizeCcYear(group.results);
      return {
        eventId: group.eventId,
        eventName: group.eventName,
        ...podiums,
        total: podiums.gold + podiums.silver + podiums.bronze,
      };
    })
    .filter((row) => row.total > 0);
}

export interface PersonUnofficialPr {
  eventId: string;
  eventName: string;
  eventFormat: CcEventFormat;
  single: PersonUnofficialPrValue | null;
  average: PersonUnofficialPrValue | null;
}

export interface PersonUnofficialPrValue {
  value: number;
  /** UNR */
  countryRank: number;
  /** USR; null when the person has no state. */
  stateRank: number | null;
}

/**
 * The person's best unofficial single and average per event, with their
 * national and state ranks. For team events these are the person's best team's.
 */
export async function getPersonUnofficialPrs(
  wcaId: string,
): Promise<PersonUnofficialPr[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const [eventRows, events, stateRows] = await Promise.all([
    db
      .select({ eventId: ccResult.eventId })
      .from(ccResult)
      .where(inArray(ccResult.id, personResultIds(wcaId)))
      .groupBy(ccResult.eventId),
    getCcRankingEvents(),
    db
      .select({ stateName: state.name })
      .from(person)
      .innerJoin(state, eq(person.stateId, state.id))
      .where(eq(person.wcaId, wcaId)),
  ]);
  const personEventIds = new Set(eventRows.map((row) => row.eventId));
  const stateName = stateRows[0]?.stateName ?? null;

  const prs = await Promise.all(
    events
      .filter((event) => personEventIds.has(event.id))
      .map(async (event) => {
        const [singles, averages] = await Promise.all([
          getCcEventRanking(event.id, "single"),
          getCcEventRanking(event.id, "average"),
        ]);
        const best = (
          rows: CcRankingRow[],
        ): PersonUnofficialPrValue | null => {
          const row = rows.find((candidate) =>
            candidate.competitors.some(
              (competitor) => competitor.wcaId === wcaId,
            ),
          );
          if (!row) return null;
          const stateRank = stateName
            ? (filterCcRanking(rows, {
                page: 1,
                perPage: Math.max(1, rows.length),
                name: "",
                state: [stateName],
              }).data.find((candidate) => candidate.key === row.key)
                ?.stateRank ?? null)
            : null;
          return {
            value: row.value,
            countryRank: row.countryRank,
            stateRank,
          };
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
