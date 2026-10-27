import "server-only";

/** Pending posts triggered by data: RESULTADOS, RÉCORDS and PRÓXIMAS. */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { officialEventIdsSql } from "@/lib/official-events";

export async function getPendingResultadosCompetitions(
  limit = 50,
  { includeOlder = false }: { includeOlder?: boolean } = {},
) {
  const ageFilter = includeOlder
    ? sql``
    : sql`AND c.end_date >= (CURRENT_DATE - INTERVAL '7 days')`;

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
      ${ageFilter}
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

export async function getPendingRecordPosts(
  limit = 50,
  { includeOlder = false }: { includeOlder?: boolean } = {},
) {
  const ageFilter = includeOlder
    ? sql``
    : sql`AND m."endDate" >= (CURRENT_DATE - INTERVAL '7 days')`;

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
        AND r.event_id IN ${officialEventIdsSql}
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
        AND r.event_id IN ${officialEventIdsSql}
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
    WHERE (
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
    )
      ${ageFilter}
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
