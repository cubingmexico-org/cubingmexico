import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  event,
  result,
} from "@workspace/db/schema";
import {
  BLD_FMC_MEANS_EVENTS,
  SPEEDSOLVING_AVERAGES_EVENTS,
} from "@/lib/constants";
import { getTier } from "@/lib/utils";
import { and, countDistinct, eq, gt, inArray, lte, sql } from "drizzle-orm";
import type { MollerzConditions, RankProgressRow, YearMollerz } from "./types";
import { dayBefore } from "./utils";

async function getAsOfPersonRanks(
  wcaId: string,
  stateId: string | null,
  asOf: Date,
  kind: "single" | "average",
): Promise<
  Map<
    string,
    { eventName: string; eventRank: number; nr: number; sr: number | null }
  >
> {
  const valueCol = sql.raw(kind === "single" ? "best" : "average");
  const asOfIso = asOf.toISOString();

  // rank() over all PBs equals 1 + the number of people with a strictly
  // better result, which avoids aggregating every person's PB.
  const rows = (await db.execute(sql`
    WITH mine AS (
      SELECT r.event_id, MIN(r.${valueCol}) AS best
      FROM results r
      INNER JOIN competitions c ON c.id = r.competition_id
      WHERE r.person_id = ${wcaId}
        AND r.${valueCol} > 0
        AND c.start_date <= ${asOfIso}
      GROUP BY r.event_id
    ),
    better AS (
      SELECT DISTINCT r.event_id, r.person_id, p.state_id
      FROM results r
      INNER JOIN mine m ON m.event_id = r.event_id AND r.${valueCol} < m.best
      INNER JOIN competitions c ON c.id = r.competition_id
      INNER JOIN persons p ON p.wca_id = r.person_id
      WHERE r.${valueCol} > 0
        AND c.start_date <= ${asOfIso}
    )
    SELECT
      m.event_id AS "eventId",
      e.name AS "eventName",
      e.rank AS "eventRank",
      1 + COUNT(b.person_id) AS nr,
      1 + COUNT(b.person_id) FILTER (WHERE b.state_id = ${stateId}) AS sr
    FROM mine m
    INNER JOIN events e ON e.id = m.event_id
    LEFT JOIN better b ON b.event_id = m.event_id
    GROUP BY m.event_id, e.name, e.rank
  `)) as unknown as {
    eventId: string;
    eventName: string;
    eventRank: number;
    nr: number | string;
    sr: number | string | null;
  }[];

  const map = new Map<
    string,
    { eventName: string; eventRank: number; nr: number; sr: number | null }
  >();

  for (const row of rows) {
    map.set(row.eventId, {
      eventName: row.eventName,
      eventRank: row.eventRank,
      nr: Number(row.nr),
      sr:
        stateId && row.sr !== null && row.sr !== undefined
          ? Number(row.sr)
          : null,
    });
  }

  return map;
}

export async function computeRankProgress(
  wcaId: string,
  stateId: string | null,
  yearStart: Date,
  yearEnd: Date,
): Promise<RankProgressRow[]> {
  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [singleBefore, singleAfter, averageBefore, averageAfter] =
    await Promise.all([
      getAsOfPersonRanks(wcaId, stateId, beforeDate, "single"),
      getAsOfPersonRanks(wcaId, stateId, afterDate, "single"),
      getAsOfPersonRanks(wcaId, stateId, beforeDate, "average"),
      getAsOfPersonRanks(wcaId, stateId, afterDate, "average"),
    ]);

  const rows: RankProgressRow[] = [];

  const collect = (
    type: "single" | "average",
    before: typeof singleBefore,
    after: typeof singleAfter,
  ) => {
    const eventIds = new Set([...before.keys(), ...after.keys()]);
    for (const eventId of eventIds) {
      const b = before.get(eventId);
      const a = after.get(eventId);
      if (!a) continue;

      const nrImproved = a.nr !== null && (b?.nr == null || a.nr < b.nr);
      const srImproved =
        a.sr !== null && (b?.sr == null || (b.sr !== null && a.sr < b.sr));

      if (!nrImproved && !srImproved) continue;

      rows.push({
        eventId,
        eventName: a.eventName,
        eventRank: a.eventRank,
        type,
        nrBefore: b?.nr ?? null,
        nrAfter: a.nr,
        srBefore: b?.sr ?? null,
        srAfter: a.sr,
      });
    }
  };

  collect("single", singleBefore, singleAfter);
  collect("average", averageBefore, averageAfter);

  return rows.sort(
    (x, y) => x.eventRank - y.eventRank || x.type.localeCompare(y.type),
  );
}

async function getMembershipAsOf(
  wcaId: string,
  eventIds: string[],
  asOf: Date | null,
): Promise<MollerzConditions | null> {
  const dateFilter = asOf ? lte(competition.startDate, asOf) : undefined;

  const data = await db
    .select({
      numberOfSpeedsolvingAverages: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(SPEEDSOLVING_AVERAGES_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
      numberOfBLDFMCMeans: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(BLD_FMC_MEANS_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
      hasWorldRecord: sql<boolean>`MAX(CASE WHEN ${result.regionalSingleRecord} = 'WR' OR ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END) = 1`,
      hasWorldChampionshipPodium: sql<boolean>`MAX(CASE WHEN ${result.pos} IN(1, 2, 3) AND ${result.roundTypeId} IN('f', 'c') AND ${championship.championshipType} = 'world' THEN 1 ELSE 0 END) = 1`,
      eventsWon: sql<number>`COUNT(DISTINCT CASE WHEN ${result.pos} = 1 AND ${result.roundTypeId} IN('f', 'c') THEN ${result.eventId} ELSE NULL END)`,
      eventCount: countDistinct(result.eventId),
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(
      championship,
      eq(result.competitionId, championship.competitionId),
    )
    .where(
      and(
        eq(result.personId, wcaId),
        inArray(result.eventId, eventIds),
        gt(result.best, 0),
        dateFilter,
      ),
    );

  const row = data[0];
  if (!row || Number(row.eventCount) < eventIds.length) return null;

  return {
    numberOfSpeedsolvingAverages: Number(row.numberOfSpeedsolvingAverages),
    numberOfBLDFMCMeans: Number(row.numberOfBLDFMCMeans),
    hasWorldRecord: Boolean(row.hasWorldRecord),
    hasWorldChampionshipPodium: Boolean(row.hasWorldChampionshipPodium),
    eventsWon: Number(row.eventsWon),
  };
}

export async function computeYearMollerz(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<YearMollerz> {
  const events = await db
    .select({ id: event.id })
    .from(event)
    .where(sql`${event.rank} < 200`);

  const eventIds = events.map((e) => e.id);
  if (eventIds.length === 0) return null;

  const beforeDate = dayBefore(yearStart);
  const afterDate = dayBefore(yearEnd);

  const [conditionsBefore, conditionsAfter] = await Promise.all([
    getMembershipAsOf(wcaId, eventIds, beforeDate),
    getMembershipAsOf(wcaId, eventIds, afterDate),
  ]);

  if (!conditionsAfter) return null;

  return {
    tierBefore: getTier(conditionsBefore),
    tierAfter: getTier(conditionsAfter),
    conditionsBefore,
    conditionsAfter,
  };
}
