"use cache";

import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  event,
  group,
  groupMembership,
  groupRankAverage,
  groupRankSingle,
  groupRecordMarker,
  person,
  rankAverage,
  rankSingle,
  result,
  state,
  type GroupKind,
} from "@workspace/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  crossEventIdsSql,
  eventIdsSql,
  eventScopeFromDeprecated,
  inOfficialEvents,
  inScopeEvents,
} from "@/lib/official-events";
import { SINGLE_EVENTS, type EventScope } from "@/lib/constants";
import { accentInsensitiveContains } from "@/lib/search";
import {
  medalTierCountsFromMergedSql,
  mergedPodiumRowsSql,
} from "@/lib/medals";
import type { GetGroupSORSchema } from "./sor-validations";
import type { SumOfGroupRanks } from "./sor-types";

export type GroupMedals = {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
};

export type GroupTopPodiumMember = {
  wcaId: string;
  name: string | null;
  podiums: number;
};

export async function getGroupsByKind(
  kind: GroupKind,
  opts?: { publicOnly?: boolean },
) {
  cacheLife("days");
  cacheTag(`groups-directory-${kind}`);

  const publicOnly = opts?.publicOnly ?? kind === "sponsor";

  const where = and(
    eq(group.kind, kind),
    eq(group.isActive, true),
    publicOnly && kind === "sponsor"
      ? eq(group.sponsorshipStatus, "active")
      : undefined,
  );

  const rows = await db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      description: group.description,
      image: group.image,
      coverImage: group.coverImage,
      regionLabel: group.regionLabel,
      websiteUrl: group.websiteUrl,
      founded: group.founded,
      isActive: group.isActive,
      sponsorshipStatus: group.sponsorshipStatus,
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
    .groupBy(
      group.id,
      group.kind,
      group.name,
      group.description,
      group.image,
      group.coverImage,
      group.regionLabel,
      group.websiteUrl,
      group.founded,
      group.isActive,
      group.sponsorshipStatus,
    )
    .orderBy(asc(group.name));

  return rows;
}

export async function getPublicitySponsors() {
  cacheLife("days");
  cacheTag("groups-publicity");

  return db
    .select({
      id: group.id,
      name: group.name,
      image: group.image,
      icon: group.icon,
      websiteUrl: group.websiteUrl,
      publicityBlurb: group.publicityBlurb,
    })
    .from(group)
    .where(
      and(
        eq(group.kind, "sponsor"),
        eq(group.isActive, true),
        eq(group.sponsorshipStatus, "active"),
        eq(group.publicityEnabled, true),
      ),
    )
    .orderBy(asc(group.name));
}

export async function getGroupInfo(groupId: string) {
  cacheLife("days");
  cacheTag(`group-info-${groupId}`);

  const [row] = await db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      description: group.description,
      image: group.image,
      icon: group.icon,
      coverImage: group.coverImage,
      founded: group.founded,
      socialLinks: group.socialLinks,
      isActive: group.isActive,
      regionLabel: group.regionLabel,
      websiteUrl: group.websiteUrl,
      sponsorshipStatus: group.sponsorshipStatus,
      sponsorshipExpiresAt: group.sponsorshipExpiresAt,
      publicityEnabled: group.publicityEnabled,
      publicityBlurb: group.publicityBlurb,
    })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);

  return row ?? null;
}

export async function getGroupTotalMembers(groupId: string) {
  cacheLife("days");
  cacheTag(`group-total-members-${groupId}`);

  const [row] = await db
    .select({ total: count() })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    );

  return row?.total ?? 0;
}

export async function getGroupShellData(groupId: string) {
  const [info, totalMembers] = await Promise.all([
    getGroupInfo(groupId),
    getGroupTotalMembers(groupId),
  ]);
  if (!info) return null;
  return { group: info, totalMembers };
}

export async function getGroupMembers(groupId: string) {
  cacheLife("days");
  cacheTag(`group-members-${groupId}`);

  return db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      gender: person.gender,
      state: state.name,
      stateId: person.stateId,
      specialties: groupMembership.specialties,
      role: groupMembership.role,
      hideFromRoster: groupMembership.hideFromRoster,
    })
    .from(groupMembership)
    .innerJoin(person, eq(groupMembership.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(eq(groupMembership.groupId, groupId))
    .orderBy(asc(person.name));
}

export async function getGroupMedals(groupId: string): Promise<GroupMedals> {
  cacheLife("days");
  cacheTag(`group-podiums-${groupId}`);

  const {
    gold: goldSql,
    silver: silverSql,
    bronze: bronzeSql,
  } = medalTierCountsFromMergedSql();
  const medalsRows = (await db.execute(sql`
    SELECT
      ${goldSql} AS gold,
      ${silverSql} AS silver,
      ${bronzeSql} AS bronze
    FROM (
      ${mergedPodiumRowsSql(sql`r.person_id IN (
        SELECT person_id FROM group_memberships
        WHERE group_id = ${groupId} AND hide_from_roster = false
      )`)}
    ) ranked
    WHERE ranked.rn = 1
  `)) as unknown as Array<{ gold: number; silver: number; bronze: number }>;

  const gold = Number(medalsRows[0]?.gold ?? 0);
  const silver = Number(medalsRows[0]?.silver ?? 0);
  const bronze = Number(medalsRows[0]?.bronze ?? 0);

  return {
    gold,
    silver,
    bronze,
    total: gold + silver + bronze,
  };
}

export async function getGroupTopMembersByPodiums(
  groupId: string,
  limit = 5,
): Promise<GroupTopPodiumMember[]> {
  cacheLife("days");
  cacheTag(`group-top-podiums-${groupId}`);

  return db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      podiums: count().as("podiums"),
    })
    .from(groupMembership)
    .innerJoin(person, eq(groupMembership.personId, person.wcaId))
    .innerJoin(result, eq(person.wcaId, result.personId))
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
        or(eq(result.roundTypeId, "f"), eq(result.roundTypeId, "c")),
        inArray(result.pos, [1, 2, 3]),
        gt(result.best, 0),
      ),
    )
    .groupBy(person.wcaId, person.name)
    .orderBy(desc(count()), asc(person.name))
    .limit(limit);
}

type GroupRecordRow = {
  eventId: string;
  eventName: string | null;
  type: "single" | "average";
  best: number;
  personId: string;
  personName: string | null;
  groupRank: number | null;
  competitionId: string | null;
  competitionName: string | null;
};

/** Earliest competition where this person set the given single/average value. */
function pbCompetitionSelect(
  personIdSql: SQL,
  eventIdSql: SQL,
  valueSql: SQL,
  valueColumn: "best" | "average",
) {
  const valueRef = valueColumn === "best" ? sql`r.best` : sql`r.average`;
  return {
    competitionId: sql<string | null>`(
      SELECT r.competition_id
      FROM ${result} r
      INNER JOIN ${competition} c ON c.id = r.competition_id
      WHERE r.person_id = ${personIdSql}
        AND r.event_id = ${eventIdSql}
        AND ${valueRef} = ${valueSql}
        AND ${valueRef} > 0
      ORDER BY c.end_date ASC NULLS LAST, c.start_date ASC, r.id ASC
      LIMIT 1
    )`.as("competitionId"),
    competitionName: sql<string | null>`(
      SELECT c.name
      FROM ${result} r
      INNER JOIN ${competition} c ON c.id = r.competition_id
      WHERE r.person_id = ${personIdSql}
        AND r.event_id = ${eventIdSql}
        AND ${valueRef} = ${valueSql}
        AND ${valueRef} > 0
      ORDER BY c.end_date ASC NULLS LAST, c.start_date ASC, r.id ASC
      LIMIT 1
    )`.as("competitionName"),
  };
}

export async function getGroupCurrentRecords(
  groupId: string,
): Promise<GroupRecordRow[]> {
  cacheLife("days");
  cacheTag(`group-records-${groupId}`);

  const memberIds = await db
    .select({ personId: groupMembership.personId })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    );

  if (memberIds.length === 0) {
    return [];
  }

  const [singles, averages] = await Promise.all([
    db
      .select({
        eventId: groupRankSingle.eventId,
        eventName: event.name,
        best: groupRankSingle.best,
        personId: groupRankSingle.personId,
        personName: person.name,
        groupRank: groupRankSingle.groupRank,
        ...pbCompetitionSelect(
          sql`${groupRankSingle.personId}`,
          sql`${groupRankSingle.eventId}`,
          sql`${groupRankSingle.best}`,
          "best",
        ),
      })
      .from(groupRankSingle)
      .innerJoin(event, eq(groupRankSingle.eventId, event.id))
      .innerJoin(person, eq(groupRankSingle.personId, person.wcaId))
      .where(
        and(
          eq(groupRankSingle.groupId, groupId),
          eq(groupRankSingle.groupRank, 1),
          gt(groupRankSingle.best, 0),
          inOfficialEvents(groupRankSingle.eventId),
        ),
      )
      .orderBy(asc(event.rank)),
    db
      .select({
        eventId: groupRankAverage.eventId,
        eventName: event.name,
        best: groupRankAverage.best,
        personId: groupRankAverage.personId,
        personName: person.name,
        groupRank: groupRankAverage.groupRank,
        ...pbCompetitionSelect(
          sql`${groupRankAverage.personId}`,
          sql`${groupRankAverage.eventId}`,
          sql`${groupRankAverage.best}`,
          "average",
        ),
      })
      .from(groupRankAverage)
      .innerJoin(event, eq(groupRankAverage.eventId, event.id))
      .innerJoin(person, eq(groupRankAverage.personId, person.wcaId))
      .where(
        and(
          eq(groupRankAverage.groupId, groupId),
          eq(groupRankAverage.groupRank, 1),
          gt(groupRankAverage.best, 0),
          inOfficialEvents(groupRankAverage.eventId),
        ),
      )
      .orderBy(asc(event.rank)),
  ]);

  return [
    ...singles.map((row) => ({ ...row, type: "single" as const })),
    ...averages.map((row) => ({ ...row, type: "average" as const })),
  ];
}

export async function getGroupHistoricalRecordCount(groupId: string) {
  cacheLife("days");
  cacheTag(`group-records-${groupId}`);

  const [row] = await db
    .select({ total: count() })
    .from(groupRecordMarker)
    .where(eq(groupRecordMarker.groupId, groupId));

  return row?.total ?? 0;
}

export async function getPersonGroups(wcaId: string) {
  cacheLife("days");
  cacheTag(`person-groups-${wcaId}`);

  return db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      image: group.image,
      icon: group.icon,
      role: groupMembership.role,
    })
    .from(groupMembership)
    .innerJoin(group, eq(groupMembership.groupId, group.id))
    .where(and(eq(groupMembership.personId, wcaId), eq(group.isActive, true)))
    .orderBy(asc(group.kind), asc(group.name));
}

export async function getGroupRanks(
  groupId: string,
  eventId: string,
  rankType: "single" | "average",
) {
  cacheLife("days");
  cacheTag(`group-ranks-${groupId}`);

  const table = rankType === "single" ? groupRankSingle : groupRankAverage;
  const national = rankType === "single" ? rankSingle : rankAverage;

  return db
    .select({
      personId: table.personId,
      name: person.name,
      best: table.best,
      groupRank: table.groupRank,
      countryRank: national.countryRank,
      state: state.name,
      stateId: person.stateId,
      gender: person.gender,
      ...pbCompetitionSelect(
        sql`${table.personId}`,
        sql`${table.eventId}`,
        sql`${table.best}`,
        rankType === "single" ? "best" : "average",
      ),
    })
    .from(table)
    .innerJoin(person, eq(table.personId, person.wcaId))
    .innerJoin(
      national,
      and(
        eq(national.personId, table.personId),
        eq(national.eventId, table.eventId),
      ),
    )
    .leftJoin(state, eq(person.stateId, state.id))
    .where(and(eq(table.groupId, groupId), eq(table.eventId, eventId)))
    .orderBy(asc(table.groupRank));
}

type RankType = "single" | "average";

function getGroupRankTable(rankType: RankType) {
  return rankType === "single" ? groupRankSingle : groupRankAverage;
}

export async function getGroupSOR(
  input: GetGroupSORSchema,
  groupId: string,
  rankType: RankType,
) {
  cacheLife("days");
  cacheTag(`group-sor-${groupId}-${rankType}`);

  const offset = (input.page - 1) * input.perPage;
  const scopeEventIds = eventIdsSql(eventScopeFromDeprecated(input.deprecated));
  const rankTable = getGroupRankTable(rankType);

  const peopleFilters: SQL[] = [];
  if (input.name) {
    peopleFilters.push(accentInsensitiveContains(sql`p.name`, input.name));
  }
  if (input.gender && input.gender.length > 0) {
    peopleFilters.push(
      sql`p.gender IN (${sql.join(
        input.gender.map((g: string) => sql`${g}`),
        sql`, `,
      )})`,
    );
  }

  const peopleFilterSql =
    peopleFilters.length > 0
      ? sql`AND ${sql.join(peopleFilters, sql` AND `)}`
      : sql``;

  const orderFragments: SQL[] =
    input.sort && input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "name":
              return item.desc ? sql`p.name DESC` : sql`p.name ASC`;
            case "gender":
              return item.desc ? sql`p.gender DESC` : sql`p.gender ASC`;
            default:
              return item.desc ? sql`t.overall DESC` : sql`t.overall ASC`;
          }
        })
      : [sql`t.overall ASC`, sql`p.name ASC`];

  const totalRows = (await db.execute(
    sql`
      WITH people AS (
        SELECT DISTINCT p.wca_id
        FROM ${person} p
        INNER JOIN ${groupMembership} gm
          ON gm.person_id = p.wca_id
         AND gm.group_id = ${groupId}
         AND gm.hide_from_roster = false
        INNER JOIN ${rankTable} r
          ON r.person_id = p.wca_id AND r.group_id = ${groupId}
        WHERE r.group_rank IS NOT NULL
          AND r.event_id IN ${scopeEventIds}
          ${peopleFilterSql}
      )
      SELECT count(*)::int AS count FROM people;
    `,
  )) as unknown as { count: number }[];

  const data = (await db.execute(
    sql`
      WITH scope_events AS (
        SELECT id, rank
        FROM ${event}
        WHERE id IN ${scopeEventIds}
      ),
      worst_ranks AS (
        SELECT
          r.event_id,
          MAX(r.group_rank) + 1 AS worst_rank
        FROM ${rankTable} r
        WHERE r.group_id = ${groupId}
          AND r.group_rank IS NOT NULL
          AND r.event_id IN ${scopeEventIds}
        GROUP BY r.event_id
      ),
      people AS (
        SELECT
          p.wca_id AS person_id,
          p.name,
          s.name AS state,
          p.gender
        FROM ${person} p
        INNER JOIN ${groupMembership} gm
          ON gm.person_id = p.wca_id
         AND gm.group_id = ${groupId}
         AND gm.hide_from_roster = false
        LEFT JOIN ${state} s ON p.state_id = s.id
        WHERE EXISTS (
            SELECT 1
            FROM ${rankTable} r
            WHERE r.person_id = p.wca_id
              AND r.group_id = ${groupId}
              AND r.group_rank IS NOT NULL
              AND r.event_id IN ${scopeEventIds}
          )
          ${peopleFilterSql}
      ),
      rank_data AS (
        SELECT
          r.person_id,
          r.event_id,
          r.group_rank
        FROM ${rankTable} r
        WHERE r.group_id = ${groupId}
          AND r.event_id IN ${scopeEventIds}
      ),
      person_events AS (
        SELECT
          p.person_id,
          p.name,
          p.state,
          p.gender,
          e.id AS event_id,
          e.rank,
          COALESCE(NULLIF(r.group_rank, 0), COALESCE(wr.worst_rank, 1)) AS group_rank,
          r.group_rank AS original_group_rank
        FROM people p
        CROSS JOIN scope_events e
        LEFT JOIN rank_data r
          ON r.person_id = p.person_id
         AND r.event_id = e.id
        LEFT JOIN worst_ranks wr
          ON wr.event_id = e.id
      ),
      totals AS (
        SELECT
          person_id,
          SUM(group_rank) AS overall
        FROM person_events
        GROUP BY person_id
      ),
      ranked AS (
        SELECT
          p.person_id,
          p.name,
          p.state,
          p.gender,
          t.overall,
          ROW_NUMBER() OVER (ORDER BY ${sql.join(orderFragments, sql`, `)}) AS rank
        FROM people p
        INNER JOIN totals t ON t.person_id = p.person_id
      ),
      paged AS (
        SELECT *
        FROM ranked
        ORDER BY rank
        LIMIT ${input.perPage}
        OFFSET ${offset}
      )
      SELECT
        p.rank,
        p.person_id AS "personId",
        p.name,
        p.overall,
        p.state,
        p.gender,
        json_agg(
          json_build_object(
            'eventId', pe.event_id,
            'groupRank', pe.group_rank,
            'completed', (
              CASE WHEN pe.original_group_rank IS NOT NULL AND pe.original_group_rank > 0
              THEN true ELSE false END
            )
          )
          ORDER BY pe.rank
        ) AS events
      FROM paged p
      INNER JOIN person_events pe ON pe.person_id = p.person_id
      GROUP BY p.rank, p.person_id, p.name, p.overall, p.state, p.gender
      ORDER BY p.rank;
    `,
  )) as unknown as SumOfGroupRanks[];

  return {
    data,
    pageCount: Math.ceil((totalRows[0]?.count ?? 0) / input.perPage),
  };
}

export async function getGroupSORGenderCounts(
  groupId: string,
  rankType: RankType,
  scope: EventScope,
) {
  cacheLife("days");
  cacheTag(`group-sor-gender-counts-${groupId}-${rankType}`);

  const rankTable = getGroupRankTable(rankType);

  return await db
    .select({
      gender: person.gender,
      count: sql<number>`count(distinct ${person.wcaId})`.mapWith(Number),
    })
    .from(rankTable)
    .innerJoin(person, eq(rankTable.personId, person.wcaId))
    .innerJoin(
      groupMembership,
      and(
        eq(groupMembership.personId, person.wcaId),
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .where(
      and(
        eq(rankTable.groupId, groupId),
        sql`${rankTable.groupRank} is not null`,
        inScopeEvents(rankTable.eventId, scope),
      ),
    )
    .groupBy(person.gender)
    .orderBy(person.gender)
    .then((rows) =>
      rows.reduce(
        (acc, { gender, count }) => {
          if (!gender) return acc;
          acc[gender] = count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    );
}

export interface GroupKinchPerson {
  id: string;
  name: string;
  events: { eventId: string; ratio: number }[];
  overall: number;
}

/** Kinch scores relative to group records (group_rank = 1), like state Kinch. */
export async function getGroupKinch(
  groupId: string,
  scope: EventScope = "official",
): Promise<GroupKinchPerson[]> {
  cacheLife("days");
  cacheTag(`group-kinch-${groupId}`);

  const scopeEventIds = crossEventIdsSql(scope);

  const data = await db.execute(sql`
    WITH PersonalRecords AS (
      SELECT
        person_id,
        event_id,
        MIN(best) AS personal_best,
        'average' AS type
      FROM ${groupRankAverage}
      WHERE group_id = ${groupId}
        AND event_id IN ${scopeEventIds}
        AND best > 0
      GROUP BY person_id, event_id
      UNION ALL
      SELECT
        person_id,
        event_id,
        MIN(best) AS personal_best,
        'single' AS type
      FROM ${groupRankSingle}
      WHERE group_id = ${groupId}
        AND event_id IN (${sql.join(SINGLE_EVENTS, sql`, `)})
        AND best > 0
      GROUP BY person_id, event_id
    ),
    GroupRecords AS (
      SELECT
        event_id,
        MIN(best) AS group_best,
        'average' AS type
      FROM ${groupRankAverage}
      WHERE group_id = ${groupId}
        AND group_rank = 1
        AND event_id IN ${scopeEventIds}
        AND best > 0
      GROUP BY event_id
      UNION ALL
      SELECT
        event_id,
        MIN(best) AS group_best,
        'single' AS type
      FROM ${groupRankSingle}
      WHERE group_id = ${groupId}
        AND group_rank = 1
        AND event_id IN (${sql.join(SINGLE_EVENTS, sql`, `)})
        AND best > 0
      GROUP BY event_id
    ),
    Persons AS (
      SELECT
        p.wca_id AS person_id,
        p.name
      FROM ${person} p
      INNER JOIN ${groupMembership} gm
        ON gm.person_id = p.wca_id
       AND gm.group_id = ${groupId}
       AND gm.hide_from_roster = false
    ),
    Events AS (
      SELECT id, rank
      FROM ${event}
      WHERE id IN ${scopeEventIds}
    ),
    Ratios AS (
      SELECT
        p.person_id,
        e.id AS event_id,
        e.rank,
        COALESCE(
          MAX(
            CASE
              WHEN e.id = '333mbf' THEN
                CASE
                  WHEN COALESCE(pr.personal_best, 0) != 0 THEN
                    ((99 - CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 1, 2) AS FLOAT) +
                      (1 - (CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 3, 5) AS FLOAT) / 3600))) /
                    ((99 - CAST(SUBSTRING(CAST(gr.group_best AS TEXT), 1, 2) AS FLOAT)) +
                      (1 - (CAST(SUBSTRING(CAST(gr.group_best AS TEXT), 3, 5) AS FLOAT) / 3600)))
                    ) * 100
                  ELSE 0
                END
              WHEN COALESCE(pr.personal_best, 0) != 0
                AND COALESCE(gr.group_best, 0) != 0 THEN
                (gr.group_best / COALESCE(pr.personal_best, 0)::FLOAT) * 100
              ELSE 0
            END
          ),
          0
        ) AS best_ratio
      FROM Persons p
      CROSS JOIN Events e
      LEFT JOIN PersonalRecords pr
        ON p.person_id = pr.person_id AND e.id = pr.event_id
      LEFT JOIN GroupRecords gr
        ON e.id = gr.event_id AND pr.type = gr.type
      GROUP BY p.person_id, e.id, e.rank
    )
    SELECT
      p.person_id AS id,
      p.name,
      json_agg(
        json_build_object(
          'eventId', r.event_id,
          'ratio', r.best_ratio
        )
        ORDER BY r.rank
      ) AS events,
      COALESCE(AVG(r.best_ratio), 0) AS overall
    FROM Ratios r
    JOIN Persons p ON r.person_id = p.person_id
    GROUP BY p.person_id, p.name
    ORDER BY overall DESC;
  `);

  return data as unknown as GroupKinchPerson[];
}
