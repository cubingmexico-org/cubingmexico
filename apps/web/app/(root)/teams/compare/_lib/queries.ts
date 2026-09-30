import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  event,
  person,
  rankAverage,
  rankSingle,
  result,
  roundType,
} from "@workspace/db/schema";
import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import { recordDateSql, toDateKey } from "@/lib/record-date";
import type { HeadToHeadRound } from "@/lib/head-to-head";

export type TeamBestRecord = {
  best: number;
  personId: string;
  personName: string | null;
};

export type TeamBestRecords = Record<
  string,
  { single?: TeamBestRecord; average?: TeamBestRecord }
>;

async function getStateRankLeaders(
  stateId: string,
  table: typeof rankSingle | typeof rankAverage,
) {
  return db
    .select({
      eventId: table.eventId,
      best: table.best,
      personId: person.wcaId,
      personName: person.name,
    })
    .from(table)
    .innerJoin(person, eq(table.personId, person.wcaId))
    .where(
      and(
        eq(person.stateId, stateId),
        eq(table.stateRank, 1),
        notInArray(table.eventId, EXCLUDED_EVENTS),
      ),
    )
    .orderBy(asc(table.eventId), asc(person.name));
}

export async function getTeamBestRecords(
  stateId: string,
): Promise<TeamBestRecords> {
  "use cache";
  cacheLife("days");
  cacheTag(`team-best-records-${stateId}`);

  const [singles, averages] = await Promise.all([
    getStateRankLeaders(stateId, rankSingle),
    getStateRankLeaders(stateId, rankAverage),
  ]);

  const records: TeamBestRecords = {};
  for (const row of singles) {
    const entry = (records[row.eventId] ??= {});
    entry.single ??= row;
  }
  for (const row of averages) {
    const entry = (records[row.eventId] ??= {});
    entry.average ??= row;
  }
  return records;
}

function bestMemberPerRound(stateId: string, alias: string) {
  return db
    .select({
      competitionId: result.competitionId,
      eventId: result.eventId,
      roundTypeId: result.roundTypeId,
      personId: result.personId,
      personName: person.name,
      pos: result.pos,
      best: result.best,
      average: result.average,
      rn: sql<number>`ROW_NUMBER() OVER (
        PARTITION BY ${result.competitionId}, ${result.eventId}, ${result.roundTypeId}
        ORDER BY
          CASE WHEN ${result.pos} > 0 THEN ${result.pos} END ASC NULLS LAST,
          CASE WHEN ${result.best} > 0 THEN ${result.best} END ASC NULLS LAST
      )`.as("rn"),
    })
    .from(result)
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(eq(person.stateId, stateId))
    .as(alias);
}

/** Drizzle drops the subquery prefix on SQL-aliased fields, so qualify `rn` by hand. */
function isBestMember(alias: string) {
  return sql`${sql.identifier(alias)}."rn" = 1`;
}

export async function getTeamHeadToHeadResults(
  a: string,
  b: string,
): Promise<HeadToHeadRound[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`team-head-to-head-${[a, b].sort().join("-")}`);

  const teamA = bestMemberPerRound(a, "team_a");
  const teamB = bestMemberPerRound(b, "team_b");

  const rows = await db
    .select({
      competitionId: competition.id,
      competitionName: competition.name,
      date: recordDateSql,
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      roundTypeId: teamA.roundTypeId,
      aPersonId: teamA.personId,
      aPersonName: teamA.personName,
      aPos: teamA.pos,
      aBest: teamA.best,
      aAverage: teamA.average,
      bPersonId: teamB.personId,
      bPersonName: teamB.personName,
      bPos: teamB.pos,
      bBest: teamB.best,
      bAverage: teamB.average,
    })
    .from(teamA)
    .innerJoin(
      teamB,
      and(
        eq(teamB.competitionId, teamA.competitionId),
        eq(teamB.eventId, teamA.eventId),
        eq(teamB.roundTypeId, teamA.roundTypeId),
        isBestMember("team_b"),
      ),
    )
    .innerJoin(competition, eq(teamA.competitionId, competition.id))
    .innerJoin(event, eq(teamA.eventId, event.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, teamA.competitionId),
        eq(competitionRoundDate.eventId, teamA.eventId),
        eq(competitionRoundDate.roundTypeId, teamA.roundTypeId),
      ),
    )
    .leftJoin(roundType, eq(teamA.roundTypeId, roundType.id))
    .where(isBestMember("team_a"))
    .orderBy(desc(recordDateSql), asc(event.rank), desc(roundType.rank));

  return rows.map((row) => ({
    competitionId: row.competitionId,
    competitionName: row.competitionName,
    date: toDateKey(row.date),
    eventId: row.eventId,
    eventName: row.eventName,
    eventRank: row.eventRank,
    roundTypeId: row.roundTypeId,
    a: {
      pos: row.aPos,
      best: row.aBest,
      average: row.aAverage,
      personId: row.aPersonId,
      personName: row.aPersonName,
    },
    b: {
      pos: row.bPos,
      best: row.bBest,
      average: row.bAverage,
      personId: row.bPersonId,
      personName: row.bPersonName,
    },
  }));
}
