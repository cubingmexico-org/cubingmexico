import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  exportMetadata,
  person,
  socialPost,
  state,
  teamMember,
} from "@workspace/db/schema";
import { accentInsensitiveContains } from "@/lib/search";
import { and, asc, count, desc, eq, isNull, or, sql } from "drizzle-orm";

export async function getExportMetadata() {
  return await db
    .select({
      key: exportMetadata.key,
      value: exportMetadata.value,
      updatedAt: exportMetadata.updatedAt,
    })
    .from(exportMetadata)
    .orderBy(asc(exportMetadata.key));
}

export async function getAdminOverviewCounts() {
  const [personsWithoutState] = await db
    .select({ value: count() })
    .from(person)
    .where(isNull(person.stateId));

  const [compsMissingState] = await db
    .select({ value: count() })
    .from(competition)
    .where(
      and(eq(competition.countryId, "Mexico"), isNull(competition.stateId)),
    );

  const [socialPostsTotal] = await db
    .select({ value: count() })
    .from(socialPost);

  return {
    personsWithoutState: personsWithoutState?.value ?? 0,
    compsMissingState: compsMissingState?.value ?? 0,
    socialPostsTotal: socialPostsTotal?.value ?? 0,
  };
}

export async function getSocialPosts(limit = 100) {
  return await db
    .select({
      id: socialPost.id,
      postType: socialPost.postType,
      subjectKey: socialPost.subjectKey,
      competitionId: socialPost.competitionId,
      competitionName: competition.name,
      cityName: competition.cityName,
      platform: socialPost.platform,
      externalId: socialPost.externalId,
      postedAt: socialPost.postedAt,
    })
    .from(socialPost)
    .leftJoin(competition, eq(socialPost.competitionId, competition.id))
    .orderBy(desc(socialPost.postedAt))
    .limit(limit);
}

export async function getSocialPostStats() {
  const [totals] = await db
    .select({
      total: count(),
      competitions: sql<number>`count(distinct ${socialPost.competitionId})`,
      facebook: sql<number>`count(*) filter (where ${socialPost.platform} = 'facebook')`,
      instagram: sql<number>`count(*) filter (where ${socialPost.platform} = 'instagram')`,
      resultados: sql<number>`count(*) filter (where ${socialPost.postType} = 'resultados')`,
      records: sql<number>`count(*) filter (where ${socialPost.postType} = 'record')`,
      upcoming: sql<number>`count(*) filter (where ${socialPost.postType} = 'upcoming')`,
    })
    .from(socialPost);

  return {
    total: Number(totals?.total ?? 0),
    competitions: Number(totals?.competitions ?? 0),
    facebook: Number(totals?.facebook ?? 0),
    instagram: Number(totals?.instagram ?? 0),
    resultados: Number(totals?.resultados ?? 0),
    records: Number(totals?.records ?? 0),
    upcoming: Number(totals?.upcoming ?? 0),
  };
}

export async function getPendingResultadosCompetitions(limit = 50) {
  const rows = (await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.city_name AS "cityName",
      c.end_date AS "endDate",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'resultados'
          AND sp.subject_key = c.id
          AND sp.platform = 'facebook'
      ) AS "facebookPosted",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'resultados'
          AND sp.subject_key = c.id
          AND sp.platform = 'instagram'
      ) AS "instagramPosted"
    FROM competitions c
    WHERE c.country_id = 'Mexico'
      AND EXISTS (
        SELECT 1 FROM results r WHERE r.competition_id = c.id
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.post_type = 'resultados'
            AND sp.subject_key = c.id
            AND sp.platform = 'facebook'
        )
        OR NOT EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.post_type = 'resultados'
            AND sp.subject_key = c.id
            AND sp.platform = 'instagram'
        )
      )
    ORDER BY c.end_date DESC
    LIMIT ${limit}
  `)) as unknown as Array<{
    id: string;
    name: string;
    cityName: string;
    endDate: Date;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>;

  return rows.map((row) => ({
    id: row.id,
    subjectKey: row.id,
    name: row.name,
    cityName: row.cityName,
    endDate: row.endDate,
    facebookPosted: Boolean(row.facebookPosted),
    instagramPosted: Boolean(row.instagramPosted),
  }));
}

export async function getPendingRecordPosts(limit = 50) {
  const rows = (await db.execute(sql`
    WITH markers AS (
      SELECT
        r.id || ':single' AS subject_key,
        r.id AS result_id,
        r.person_id AS "personId",
        p.name AS "personName",
        s.name AS "stateName",
        e.name AS "eventName",
        r.event_id AS "eventId",
        'single' AS kind,
        r.regional_single_record AS level,
        r.best AS value,
        r.competition_id AS "competitionId",
        c.name AS "competitionName",
        c.end_date AS "endDate"
      FROM results r
      JOIN persons p ON p.wca_id = r.person_id
      JOIN events e ON e.id = r.event_id
      LEFT JOIN states s ON s.id = p.state_id
      LEFT JOIN competitions c ON c.id = r.competition_id
      WHERE r.regional_single_record IN ('NR', 'NAR', 'WR')
      UNION ALL
      SELECT
        r.id || ':average' AS subject_key,
        r.id AS result_id,
        r.person_id AS "personId",
        p.name AS "personName",
        s.name AS "stateName",
        e.name AS "eventName",
        r.event_id AS "eventId",
        'average' AS kind,
        r.regional_average_record AS level,
        r.average AS value,
        r.competition_id AS "competitionId",
        c.name AS "competitionName",
        c.end_date AS "endDate"
      FROM results r
      JOIN persons p ON p.wca_id = r.person_id
      JOIN events e ON e.id = r.event_id
      LEFT JOIN states s ON s.id = p.state_id
      LEFT JOIN competitions c ON c.id = r.competition_id
      WHERE r.regional_average_record IN ('NR', 'NAR', 'WR')
    )
    SELECT
      m.subject_key AS "subjectKey",
      m."personId",
      m."personName",
      m."stateName",
      m."eventName",
      m."eventId",
      m.kind,
      m.level,
      m.value,
      m."competitionId",
      m."competitionName",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'record'
          AND sp.subject_key = m.subject_key
          AND sp.platform = 'facebook'
      ) AS "facebookPosted",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'record'
          AND sp.subject_key = m.subject_key
          AND sp.platform = 'instagram'
      ) AS "instagramPosted"
    FROM markers m
    WHERE
      NOT EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'record'
          AND sp.subject_key = m.subject_key
          AND sp.platform = 'facebook'
      )
      OR NOT EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'record'
          AND sp.subject_key = m.subject_key
          AND sp.platform = 'instagram'
      )
    ORDER BY m."endDate" DESC NULLS LAST, m.level DESC, m."personName"
    LIMIT ${limit}
  `)) as unknown as Array<{
    subjectKey: string;
    personId: string;
    personName: string;
    stateName: string | null;
    eventName: string;
    eventId: string;
    kind: string;
    level: string;
    value: number;
    competitionId: string | null;
    competitionName: string | null;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>;

  return rows.map((row) => ({
    subjectKey: row.subjectKey,
    personId: row.personId,
    personName: row.personName,
    stateName: row.stateName,
    eventName: row.eventName,
    eventId: row.eventId,
    kind: row.kind,
    level: row.level,
    value: Number(row.value),
    competitionId: row.competitionId,
    competitionName: row.competitionName,
    facebookPosted: Boolean(row.facebookPosted),
    instagramPosted: Boolean(row.instagramPosted),
  }));
}

export async function getPendingUpcomingCompetitions(limit = 50) {
  const rows = (await db.execute(sql`
    SELECT
      c.id,
      c.name,
      c.city_name AS "cityName",
      c.start_date AS "startDate",
      s.name AS "stateName",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'upcoming'
          AND sp.subject_key = c.id
          AND sp.platform = 'facebook'
      ) AS "facebookPosted",
      EXISTS (
        SELECT 1 FROM social_posts sp
        WHERE sp.post_type = 'upcoming'
          AND sp.subject_key = c.id
          AND sp.platform = 'instagram'
      ) AS "instagramPosted"
    FROM competitions c
    LEFT JOIN states s ON s.id = c.state_id
    WHERE c.country_id = 'Mexico'
      AND c.cancelled = false
      AND c.start_date > NOW()
      AND (
        NOT EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.post_type = 'upcoming'
            AND sp.subject_key = c.id
            AND sp.platform = 'facebook'
        )
        OR NOT EXISTS (
          SELECT 1 FROM social_posts sp
          WHERE sp.post_type = 'upcoming'
            AND sp.subject_key = c.id
            AND sp.platform = 'instagram'
        )
      )
    ORDER BY c.start_date ASC
    LIMIT ${limit}
  `)) as unknown as Array<{
    id: string;
    name: string;
    cityName: string;
    startDate: Date;
    stateName: string | null;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>;

  return rows.map((row) => ({
    id: row.id,
    subjectKey: row.id,
    name: row.name,
    cityName: row.cityName,
    startDate: row.startDate,
    stateName: row.stateName,
    facebookPosted: Boolean(row.facebookPosted),
    instagramPosted: Boolean(row.instagramPosted),
  }));
}

export async function searchPersons(search: string, limit = 20) {
  const term = search.trim();
  if (!term) {
    return [];
  }

  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      stateId: person.stateId,
      role: teamMember.role,
    })
    .from(person)
    .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
    .where(
      or(
        accentInsensitiveContains(person.name, term),
        accentInsensitiveContains(person.wcaId, term),
      ),
    )
    .orderBy(asc(person.name))
    .limit(limit);
}

export async function getPersonsWithoutStateList(limit = 50) {
  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
    })
    .from(person)
    .where(isNull(person.stateId))
    .orderBy(asc(person.name))
    .limit(limit);
}

export async function getTeamMembersWithRoles(stateId: string) {
  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      role: teamMember.role,
    })
    .from(person)
    .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
    .where(eq(person.stateId, stateId))
    .orderBy(
      sql`CASE WHEN ${teamMember.role} IS NULL THEN 1 ELSE 0 END`,
      asc(person.name),
    );
}

export async function getMexicanCompetitions({
  missingStateOnly,
  missingLogoOnly,
  stateId,
  search,
  limit = 100,
}: {
  missingStateOnly?: boolean;
  missingLogoOnly?: boolean;
  stateId?: string | null;
  search?: string;
  limit?: number;
}) {
  const filters = [eq(competition.countryId, "Mexico")];

  if (missingStateOnly) {
    filters.push(isNull(competition.stateId));
  }

  if (missingLogoOnly) {
    filters.push(isNull(competition.logo));
  }

  if (stateId) {
    filters.push(eq(competition.stateId, stateId));
  }

  const term = search?.trim();
  if (term) {
    filters.push(
      or(
        accentInsensitiveContains(competition.name, term),
        accentInsensitiveContains(competition.id, term),
        accentInsensitiveContains(competition.cityName, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
      startDate: competition.startDate,
      stateId: competition.stateId,
      stateName: state.name,
      logo: competition.logo,
      information: competition.information,
    })
    .from(competition)
    .leftJoin(state, eq(competition.stateId, state.id))
    .where(and(...filters))
    .orderBy(desc(competition.startDate))
    .limit(limit);

  const { informationHasExtractableLogo } =
    await import("@/lib/competition-logo");

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cityName: row.cityName,
    startDate: row.startDate,
    stateId: row.stateId,
    stateName: row.stateName,
    logo: row.logo,
    hasExtractableLogo: informationHasExtractableLogo(row.information),
  }));
}
