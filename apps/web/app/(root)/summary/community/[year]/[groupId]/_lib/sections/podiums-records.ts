import "server-only";

import { db } from "@workspace/db";
import { competition, event, person, result } from "@workspace/db/schema";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { medalEligibleSql } from "@/lib/medals";
import { inOfficialEvents, isOfficialEvent } from "@/lib/official-events";
import {
  communityMemberPredicate,
  TOP_N,
  type CommunitySummaryContext,
} from "./context";
import type { CommunitySummaryRegionalRecord } from "../types";

export function queryPodiumsRecordsSection({
  groupId,
  year,
  memberYearFilter,
}: CommunitySummaryContext) {
  const isOfficialResult = inOfficialEvents(result.eventId);

  return Promise.all([
    db
      .select({
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 3)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, isOfficialResult, medalEligibleSql()))
      .then((rows) => rows[0]),

    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, isOfficialResult, medalEligibleSql()))
      .groupBy(person.wcaId, person.name)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.globalPos} = 1)`),
        asc(person.name),
      )
      .limit(TOP_N),

    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.globalPos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(and(memberYearFilter, isOfficialResult, medalEligibleSql()))
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.globalPos} = 1)`),
        asc(event.rank),
      )
      .limit(TOP_N),

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
          isOfficialEvent,
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
      .where(and(memberYearFilter, isOfficialResult))
      .then((rows) => rows[0]),

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
          inOfficialEvents(result.eventId),
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
          isOfficialResult,
          or(
            inArray(result.regionalSingleRecord, ["WR", "NAR", "NR"]),
            inArray(result.regionalAverageRecord, ["WR", "NAR", "NR"]),
          ),
        ),
      )
      .orderBy(asc(event.rank), asc(person.name)),

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
          communityMemberPredicate(groupId),
          isOfficialResult,
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

export function flattenRegionalRecords(
  regionalRecordRows: PodiumsRecordsRows[6],
): CommunitySummaryRegionalRecord[] {
  const regionalRecords: CommunitySummaryRegionalRecord[] = [];
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
