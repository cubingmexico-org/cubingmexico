import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  event,
  person,
  result,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import {
  FEATURED_CHAMPIONSHIP_TYPES,
  TOP_N,
  type TeamSummaryContext,
} from "./context";
import type {
  TeamSummaryRegionalRecord,
  TeamSummaryChampionshipPodium,
} from "../types";

function assignChampionshipPositions<
  T extends { resultId: string; pos: number | null },
>(rows: T[]): (T & { championshipPosition: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER),
  );

  let previousOldPos: number | null = null;
  let previousNewPos = 0;

  return sorted.map((row, index) => {
    const oldPos = row.pos ?? Number.MAX_SAFE_INTEGER;
    const championshipPosition =
      oldPos === previousOldPos ? previousNewPos : index + 1;
    previousOldPos = oldPos;
    previousNewPos = championshipPosition;
    return { ...row, championshipPosition };
  });
}

export function queryPodiumsRecordsSection({
  stateId,
  year,
  memberYearFilter,
}: TeamSummaryContext) {
  return Promise.all([
    // Podium aggregates
    db
      .select({
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .then((rows) => rows[0]),

    // Top podiumers
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.pos} = 1)`),
        asc(person.name),
      )
      .limit(TOP_N),

    // Dominant events: podiums by event
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.pos} = 1)`),
        asc(event.rank),
      )
      .limit(TOP_N),

    // SR by event
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        single: sql<number>`COUNT(*) FILTER (WHERE ${result.stateSingleRecord} = 'SR')::int`,
        average: sql<number>`COUNT(*) FILTER (WHERE ${result.stateAverageRecord} = 'SR')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          or(
            eq(result.stateSingleRecord, "SR"),
            eq(result.stateAverageRecord, "SR"),
          ),
        ),
      )
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(
          sql`(COUNT(*) FILTER (WHERE ${result.stateSingleRecord} = 'SR') + COUNT(*) FILTER (WHERE ${result.stateAverageRecord} = 'SR'))`,
        ),
        asc(event.rank),
      ),

    // Record totals
    db
      .select({
        wr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'WR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END))::int`,
        nar: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NAR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NAR' THEN 1 ELSE 0 END))::int`,
        nr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NR' THEN 1 ELSE 0 END))::int`,
        sr: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .then((rows) => rows[0]),

    // Top SR breakers
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        count: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          or(
            eq(result.stateSingleRecord, "SR"),
            eq(result.stateAverageRecord, "SR"),
          ),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .orderBy(
        desc(
          sql`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))`,
        ),
        asc(person.name),
      )
      .limit(TOP_N),

    // Regional records (WR/NAR/NR) detail rows
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        eventId: result.eventId,
        eventName: event.name,
        regionalSingleRecord: result.regionalSingleRecord,
        regionalAverageRecord: result.regionalAverageRecord,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          or(
            inArray(result.regionalSingleRecord, ["WR", "NAR", "NR"]),
            inArray(result.regionalAverageRecord, ["WR", "NAR", "NR"]),
          ),
        ),
      )
      .orderBy(asc(event.rank), asc(person.name)),

    // Championship final results for team members
    db
      .select({
        resultId: result.id,
        wcaId: person.wcaId,
        name: person.name,
        eventId: result.eventId,
        eventName: event.name,
        competitionId: result.competitionId,
        competitionName: competition.name,
        championshipType: championship.championshipType,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(championship, eq(championship.competitionId, competition.id))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          inArray(championship.championshipType, [
            ...FEATURED_CHAMPIONSHIP_TYPES,
          ]),
        ),
      )
      .orderBy(desc(competition.startDate), asc(event.rank)),

    // First podium year per team member (for first-time podiumers)
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        firstPodiumYear: sql<number>`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          eq(person.stateId, stateId),
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),
  ]);
}

type PodiumsRecordsRows = Awaited<
  ReturnType<typeof queryPodiumsRecordsSection>
>;

export async function buildChampionshipPodiumRows(
  championshipRows: PodiumsRecordsRows[7],
): Promise<TeamSummaryChampionshipPodium[]> {
  // Championship podium processing (MX position reassignment)
  const mxCompetitionIds = [
    ...new Set(
      championshipRows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.competitionId),
    ),
  ];

  const mxChampionshipPosByResultId = new Map<string, number>();

  if (mxCompetitionIds.length > 0) {
    const peers = await db
      .select({
        resultId: result.id,
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(
        championship,
        eq(championship.competitionId, result.competitionId),
      )
      .where(
        and(
          inArray(result.competitionId, mxCompetitionIds),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          eq(championship.championshipType, "MX"),
        ),
      );

    const groups = new Map<string, typeof peers>();
    for (const peer of peers) {
      const key = `${peer.competitionId}|${peer.eventId}|${peer.roundTypeId}`;
      const group = groups.get(key) ?? [];
      group.push(peer);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      for (const ranked of assignChampionshipPositions(group)) {
        mxChampionshipPosByResultId.set(
          ranked.resultId,
          ranked.championshipPosition,
        );
      }
    }
  }

  const championshipPodiumRows: TeamSummaryChampionshipPodium[] = [];
  for (const row of championshipRows) {
    let position: number | null = row.pos;
    if (row.championshipType === "MX") {
      position = mxChampionshipPosByResultId.get(row.resultId) ?? null;
    }
    if (position === null || position < 1 || position > 3) continue;

    championshipPodiumRows.push({
      wcaId: row.wcaId,
      name: row.name,
      eventId: row.eventId,
      eventName: row.eventName,
      championshipType: row.championshipType,
      competitionName: row.competitionName,
      position,
    });
  }

  return championshipPodiumRows;
}

export function flattenRegionalRecords(
  regionalRecordRows: PodiumsRecordsRows[6],
): TeamSummaryRegionalRecord[] {
  // Regional records flattened
  const regionalRecords: TeamSummaryRegionalRecord[] = [];
  for (const row of regionalRecordRows) {
    if (
      row.regionalSingleRecord === "WR" ||
      row.regionalSingleRecord === "NAR" ||
      row.regionalSingleRecord === "NR"
    ) {
      regionalRecords.push({
        wcaId: row.wcaId,
        name: row.name,
        eventId: row.eventId,
        eventName: row.eventName,
        type: row.regionalSingleRecord,
        resultType: "single",
      });
    }
    if (
      row.regionalAverageRecord === "WR" ||
      row.regionalAverageRecord === "NAR" ||
      row.regionalAverageRecord === "NR"
    ) {
      regionalRecords.push({
        wcaId: row.wcaId,
        name: row.name,
        eventId: row.eventId,
        eventName: row.eventName,
        type: row.regionalAverageRecord,
        resultType: "average",
      });
    }
  }

  return regionalRecords;
}
