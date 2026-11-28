import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  event,
  group,
  groupMembership,
  person,
  rankAverage,
  rankSingle,
  result,
  roundType,
  team,
} from "@workspace/db/schema";
import { and, asc, count, desc, eq, gt, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { inScopeEvents } from "@/lib/official-events";
import type { EventScope } from "@/lib/constants";
import { recordDateSql, toDateKey } from "@/lib/record-date";
import type { HeadToHeadRound } from "@/lib/head-to-head";
import type { CollectiveRef } from "@/lib/collective-compare";
import { collectiveRefKey } from "@/lib/collective-compare";

export type CollectiveBestRecord = {
  best: number;
  personId: string;
  personName: string | null;
};

export type CollectiveBestRecords = Record<
  string,
  { single?: CollectiveBestRecord; average?: CollectiveBestRecord }
>;

/** @deprecated Prefer CollectiveBestRecord — kept for existing imports/tests. */
export type TeamBestRecord = CollectiveBestRecord;
/** @deprecated Prefer CollectiveBestRecords — kept for existing imports/tests. */
export type TeamBestRecords = CollectiveBestRecords;

export type CollectiveCompareOption = {
  ref: CollectiveRef;
  name: string;
  image: string | null;
  icon: string | null;
};

function membershipWhere(ref: CollectiveRef): SQL {
  if (ref.kind === "team") {
    return eq(person.stateId, ref.id);
  }
  return sql`${person.wcaId} IN (
    SELECT ${groupMembership.personId}
    FROM ${groupMembership}
    WHERE ${groupMembership.groupId} = ${ref.id}
      AND ${groupMembership.hideFromRoster} = false
  )`;
}

async function getMembershipRankLeaders(
  ref: CollectiveRef,
  table: typeof rankSingle | typeof rankAverage,
  scope: EventScope,
) {
  if (ref.kind === "team") {
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
          eq(person.stateId, ref.id),
          eq(table.stateRank, 1),
          inScopeEvents(table.eventId, scope),
        ),
      )
      .orderBy(asc(table.eventId), asc(person.name));
  }

  const ranked = db
    .select({
      eventId: table.eventId,
      best: table.best,
      personId: person.wcaId,
      personName: person.name,
      rn: sql<number>`ROW_NUMBER() OVER (
        PARTITION BY ${table.eventId}
        ORDER BY ${table.best} ASC, ${person.name} ASC
      )`.as("rn"),
    })
    .from(table)
    .innerJoin(person, eq(table.personId, person.wcaId))
    .innerJoin(
      groupMembership,
      and(
        eq(groupMembership.personId, person.wcaId),
        eq(groupMembership.groupId, ref.id),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .where(and(gt(table.best, 0), inScopeEvents(table.eventId, scope)))
    .as("ranked_leaders");

  return db
    .select({
      eventId: ranked.eventId,
      best: ranked.best,
      personId: ranked.personId,
      personName: ranked.personName,
    })
    .from(ranked)
    .where(sql`${sql.identifier("ranked_leaders")}."rn" = 1`)
    .orderBy(asc(ranked.eventId), asc(ranked.personName));
}

export async function getCollectiveBestRecords(
  ref: CollectiveRef,
  scope: EventScope = "official",
): Promise<CollectiveBestRecords> {
  "use cache";
  cacheLife("days");
  cacheTag(`collective-best-records-${collectiveRefKey(ref)}`);

  const [singles, averages] = await Promise.all([
    getMembershipRankLeaders(ref, rankSingle, scope),
    getMembershipRankLeaders(ref, rankAverage, scope),
  ]);

  const records: CollectiveBestRecords = {};
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

export async function getTeamBestRecords(
  stateId: string,
  scope: EventScope = "official",
): Promise<CollectiveBestRecords> {
  return getCollectiveBestRecords({ kind: "team", id: stateId }, scope);
}

function bestMemberPerRound(ref: CollectiveRef, alias: string) {
  const base = db
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
    .innerJoin(person, eq(result.personId, person.wcaId));

  if (ref.kind === "team") {
    return base.where(eq(person.stateId, ref.id)).as(alias);
  }

  return base
    .innerJoin(
      groupMembership,
      and(
        eq(groupMembership.personId, person.wcaId),
        eq(groupMembership.groupId, ref.id),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .as(alias);
}

/** Drizzle drops the subquery prefix on SQL-aliased fields, so qualify `rn` by hand. */
function isBestMember(alias: string) {
  return sql`${sql.identifier(alias)}."rn" = 1`;
}

export async function getCollectiveHeadToHeadResults(
  a: CollectiveRef,
  b: CollectiveRef,
  scope: EventScope = "official",
): Promise<HeadToHeadRound[]> {
  "use cache";
  cacheLife("weeks");
  const cacheKey = [collectiveRefKey(a), collectiveRefKey(b)].sort().join("-");
  cacheTag(`collective-head-to-head-${cacheKey}`);

  const sideA = bestMemberPerRound(a, "collective_a");
  const sideB = bestMemberPerRound(b, "collective_b");

  const rows = await db
    .select({
      competitionId: competition.id,
      competitionName: competition.name,
      date: recordDateSql,
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      roundTypeId: sideA.roundTypeId,
      aPersonId: sideA.personId,
      aPersonName: sideA.personName,
      aPos: sideA.pos,
      aBest: sideA.best,
      aAverage: sideA.average,
      bPersonId: sideB.personId,
      bPersonName: sideB.personName,
      bPos: sideB.pos,
      bBest: sideB.best,
      bAverage: sideB.average,
    })
    .from(sideA)
    .innerJoin(
      sideB,
      and(
        eq(sideB.competitionId, sideA.competitionId),
        eq(sideB.eventId, sideA.eventId),
        eq(sideB.roundTypeId, sideA.roundTypeId),
        isBestMember("collective_b"),
      ),
    )
    .innerJoin(competition, eq(sideA.competitionId, competition.id))
    .innerJoin(event, eq(sideA.eventId, event.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, sideA.competitionId),
        eq(competitionRoundDate.eventId, sideA.eventId),
        eq(competitionRoundDate.roundTypeId, sideA.roundTypeId),
      ),
    )
    .leftJoin(roundType, eq(sideA.roundTypeId, roundType.id))
    .where(
      and(isBestMember("collective_a"), inScopeEvents(sideA.eventId, scope)),
    )
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

export async function getTeamHeadToHeadResults(
  a: string,
  b: string,
  scope: EventScope = "official",
): Promise<HeadToHeadRound[]> {
  return getCollectiveHeadToHeadResults(
    { kind: "team", id: a },
    { kind: "team", id: b },
    scope,
  );
}

export async function getCollectiveNationalRecordCount(
  ref: CollectiveRef,
  scope: EventScope = "official",
): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag(`collective-nr-count-${collectiveRefKey(ref)}`);

  const [singles, averages] = await Promise.all([
    db
      .select({ total: count() })
      .from(rankSingle)
      .innerJoin(person, eq(rankSingle.personId, person.wcaId))
      .where(
        and(
          membershipWhere(ref),
          eq(rankSingle.countryRank, 1),
          inScopeEvents(rankSingle.eventId, scope),
        ),
      ),
    db
      .select({ total: count() })
      .from(rankAverage)
      .innerJoin(person, eq(rankAverage.personId, person.wcaId))
      .where(
        and(
          membershipWhere(ref),
          eq(rankAverage.countryRank, 1),
          inScopeEvents(rankAverage.eventId, scope),
        ),
      ),
  ]);

  return Number(singles[0]?.total ?? 0) + Number(averages[0]?.total ?? 0);
}

async function getGroupCompareOptions(kind: "community" | "sponsor") {
  const where =
    kind === "sponsor"
      ? and(
          eq(group.kind, "sponsor"),
          eq(group.isActive, true),
          eq(group.sponsorshipStatus, "active"),
        )
      : and(eq(group.kind, "community"), eq(group.isActive, true));

  return db
    .select({
      id: group.id,
      name: group.name,
      image: group.image,
      icon: group.icon,
      members: count(groupMembership.personId),
    })
    .from(group)
    .leftJoin(
      groupMembership,
      and(
        eq(groupMembership.groupId, group.id),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .where(where)
    .groupBy(group.id, group.name, group.image, group.icon)
    .having(gt(count(groupMembership.personId), 0))
    .orderBy(asc(group.name));
}

export async function getCollectiveCompareOptions(): Promise<
  CollectiveCompareOption[]
> {
  "use cache";
  cacheLife("days");
  cacheTag(
    "teams-data",
    "groups-directory-community",
    "groups-directory-sponsor",
  );

  const [teamRows, communities, sponsors] = await Promise.all([
    db
      .select({
        id: team.stateId,
        name: team.name,
        image: team.image,
        icon: team.icon,
      })
      .from(team)
      .innerJoin(
        person,
        and(eq(team.stateId, person.stateId), eq(person.hideFromRoster, false)),
      )
      .groupBy(team.stateId, team.name, team.image, team.icon)
      .having(gt(count(person.wcaId), 0))
      .orderBy(asc(team.name)),
    getGroupCompareOptions("community"),
    getGroupCompareOptions("sponsor"),
  ]);

  return [
    ...teamRows.map((row) => ({
      ref: { kind: "team" as const, id: row.id },
      name: row.name,
      image: row.image,
      icon: row.icon,
    })),
    ...communities.map((row) => ({
      ref: { kind: "community" as const, id: row.id },
      name: row.name,
      image: row.image,
      icon: row.icon,
    })),
    ...sponsors.map((row) => ({
      ref: { kind: "sponsor" as const, id: row.id },
      name: row.name,
      image: row.image,
      icon: row.icon,
    })),
  ];
}
