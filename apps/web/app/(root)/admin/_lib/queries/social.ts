import "server-only";

import {
  streaksMonthlyKeyIfDue,
  yearRecapKeyForAdmin,
} from "@/lib/social-calendar-mx";
import { db } from "@workspace/db";
import { competition, socialPost } from "@workspace/db/schema";
import {
  BLD_FMC_MEANS_EVENTS,
  EXCLUDED_EVENTS,
  SPEEDSOLVING_AVERAGES_EVENTS,
} from "@/lib/constants";
import { getTier } from "@/lib/utils";
import type { Tier } from "@/types";
import { isSummaryYearPublished } from "@/app/(root)/summary/_lib/summary-year";
import { and, count, desc, eq, sql } from "drizzle-orm";

export async function getSocialPosts({
  limit = 30,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}) {
  const [rows, [totalRow]] = await Promise.all([
    db
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
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(socialPost),
  ]);

  return {
    rows,
    total: totalRow?.value ?? 0,
  };
}

export async function deleteSocialPost(id: string) {
  const [deleted] = await db
    .delete(socialPost)
    .where(eq(socialPost.id, id))
    .returning({
      id: socialPost.id,
      postType: socialPost.postType,
      subjectKey: socialPost.subjectKey,
      platform: socialPost.platform,
    });

  return deleted ?? null;
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
      summaryUnlock: sql<number>`count(*) filter (where ${socialPost.postType} = 'summary_unlock')`,
      weeklyDigest: sql<number>`count(*) filter (where ${socialPost.postType} = 'weekly_digest')`,
      streaksMonthly: sql<number>`count(*) filter (where ${socialPost.postType} = 'streaks_monthly')`,
      mollerz: sql<number>`count(*) filter (where ${socialPost.postType} = 'mollerz')`,
      nemesis: sql<number>`count(*) filter (where ${socialPost.postType} = 'nemesis')`,
      yearRecap: sql<number>`count(*) filter (where ${socialPost.postType} = 'year_recap')`,
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
    summaryUnlock: Number(totals?.summaryUnlock ?? 0),
    weeklyDigest: Number(totals?.weeklyDigest ?? 0),
    streaksMonthly: Number(totals?.streaksMonthly ?? 0),
    mollerz: Number(totals?.mollerz ?? 0),
    nemesis: Number(totals?.nemesis ?? 0),
    yearRecap: Number(totals?.yearRecap ?? 0),
  };
}

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

export async function getPendingSummaryUnlockPosts(): Promise<
  Array<{
    subjectKey: string;
    year: number;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const year = new Date().getUTCFullYear();
  if (!isSummaryYearPublished(year)) {
    return [];
  }

  const subjectKey = String(year);
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "summary_unlock"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      year,
      facebookPosted,
      instagramPosted,
    },
  ];
}

function mexicoCityYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isoWeekKeyFromYmd(ymd: string): string {
  const [year = 0, month = 0, day = 0] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
}

export async function getPendingWeeklyDigestPosts(): Promise<
  Array<{
    subjectKey: string;
    weekKey: string;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const subjectKey = isoWeekKeyFromYmd(mexicoCityYmd());
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "weekly_digest"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      weekKey: subjectKey,
      facebookPosted,
      instagramPosted,
    },
  ];
}

export async function getPendingStreaksMonthlyPosts(): Promise<
  Array<{
    subjectKey: string;
    monthKey: string;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const subjectKey = streaksMonthlyKeyIfDue();
  if (!subjectKey) {
    return [];
  }
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "streaks_monthly"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      monthKey: subjectKey,
      facebookPosted,
      instagramPosted,
    },
  ];
}

export async function getPendingYearRecapPosts(): Promise<
  Array<{
    subjectKey: string;
    year: number;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const year = yearRecapKeyForAdmin();
  if (year === null) {
    return [];
  }
  const subjectKey = String(year);
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "year_recap"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      year,
      facebookPosted,
      instagramPosted,
    },
  ];
}

const MOLLERZ_TIER_SLUGS: Record<Tier, string> = {
  Bronce: "bronce",
  Plata: "plata",
  Oro: "oro",
  Platino: "platino",
  Ópalo: "opalo",
  Diamante: "diamante",
};

function sqlInList(values: string[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

export async function getPendingMollerzPosts(limit = 50): Promise<
  Array<{
    subjectKey: string;
    personId: string;
    personName: string;
    stateName: string | null;
    tier: Tier;
    isNewMember: boolean;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const [members, posts] = await Promise.all([
    db.execute(sql`
      WITH current_events AS (
        SELECT id FROM events WHERE id NOT IN (${sqlInList(EXCLUDED_EVENTS)})
      )
      SELECT
        p.wca_id AS "personId",
        p.name AS "personName",
        s.name AS "stateName",
        COUNT(DISTINCT CASE
          WHEN r.event_id IN (${sqlInList(SPEEDSOLVING_AVERAGES_EVENTS)}) AND r.average > 0
          THEN r.event_id
        END) AS "numberOfSpeedsolvingAverages",
        COUNT(DISTINCT CASE
          WHEN r.event_id IN (${sqlInList(BLD_FMC_MEANS_EVENTS)}) AND r.average > 0
          THEN r.event_id
        END) AS "numberOfBLDFMCMeans",
        MAX(CASE
          WHEN r.regional_single_record = 'WR' OR r.regional_average_record = 'WR'
          THEN 1 ELSE 0
        END) = 1 AS "hasWorldRecord",
        MAX(CASE
          WHEN r.pos IN (1, 2, 3) AND r.round_type_id IN ('f', 'c')
               AND ch.championship_type = 'world'
          THEN 1 ELSE 0
        END) = 1 AS "hasWorldChampionshipPodium",
        COUNT(DISTINCT CASE
          WHEN r.pos = 1 AND r.round_type_id IN ('f', 'c') THEN r.event_id
        END) AS "eventsWon"
      FROM persons p
      JOIN results r ON r.person_id = p.wca_id
      LEFT JOIN states s ON s.id = p.state_id
      LEFT JOIN championships ch ON ch.competition_id = r.competition_id
      WHERE r.event_id IN (SELECT id FROM current_events)
        AND r.best > 0
      GROUP BY p.wca_id, p.name, s.name
      HAVING COUNT(DISTINCT r.event_id) = (SELECT COUNT(*) FROM current_events)
    `) as unknown as Promise<
      Array<{
        personId: string;
        personName: string;
        stateName: string | null;
        numberOfSpeedsolvingAverages: number | string;
        numberOfBLDFMCMeans: number | string;
        hasWorldRecord: boolean;
        hasWorldChampionshipPodium: boolean;
        eventsWon: number | string;
      }>
    >,
    db
      .select({
        subjectKey: socialPost.subjectKey,
        platform: socialPost.platform,
      })
      .from(socialPost)
      .where(eq(socialPost.postType, "mollerz")),
  ]);

  const postedPlatforms = new Map<string, Set<string>>();
  const postedPersons = new Map<string, Set<string>>();
  for (const post of posts) {
    const platforms = postedPlatforms.get(post.subjectKey) ?? new Set<string>();
    platforms.add(post.platform);
    postedPlatforms.set(post.subjectKey, platforms);

    const personId = post.subjectKey.split(":")[0] ?? "";
    const keys = postedPersons.get(personId) ?? new Set<string>();
    keys.add(post.subjectKey);
    postedPersons.set(personId, keys);
  }

  const pending = [];
  for (const member of members) {
    const tier = getTier({
      numberOfSpeedsolvingAverages: Number(member.numberOfSpeedsolvingAverages),
      numberOfBLDFMCMeans: Number(member.numberOfBLDFMCMeans),
      hasWorldRecord: Boolean(member.hasWorldRecord),
      hasWorldChampionshipPodium: Boolean(member.hasWorldChampionshipPodium),
      eventsWon: Number(member.eventsWon),
    });
    if (!tier) continue;

    const subjectKey = `${member.personId}:${MOLLERZ_TIER_SLUGS[tier]}`;
    const platforms = postedPlatforms.get(subjectKey);
    const facebookPosted = platforms?.has("facebook") ?? false;
    const instagramPosted = platforms?.has("instagram") ?? false;
    if (facebookPosted && instagramPosted) continue;

    const otherKeys = [...(postedPersons.get(member.personId) ?? [])].filter(
      (key) => key !== subjectKey,
    );
    pending.push({
      subjectKey,
      personId: member.personId,
      personName: member.personName,
      stateName: member.stateName,
      tier,
      isNewMember: otherKeys.length === 0,
      facebookPosted,
      instagramPosted,
    });
  }

  return pending
    .sort((a, b) => a.personName.localeCompare(b.personName, "es"))
    .slice(0, limit);
}

/** Must match NEMESIS_FREE_MIN_EVENTS in apps/backend/social/nemesis.py. */
const NEMESIS_FREE_MIN_EVENTS = 3;

export async function getPendingNemesisPosts(limit = 50): Promise<
  Array<{
    subjectKey: string;
    personId: string;
    personName: string;
    stateName: string | null;
    eventCount: number;
    nemesizedCount: number;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const rows = (await db.execute(sql`
    SELECT
      ns.person_id AS "personId",
      p.name AS "personName",
      s.name AS "stateName",
      ns.event_count AS "eventCount",
      ns.nemesized_count AS "nemesizedCount",
      BOOL_OR(sp.platform = 'facebook') AS "facebookPosted",
      BOOL_OR(sp.platform = 'instagram') AS "instagramPosted"
    FROM nemesis_stats ns
    JOIN persons p ON p.wca_id = ns.person_id
    LEFT JOIN states s ON s.id = p.state_id
    LEFT JOIN social_posts sp
      ON sp.post_type = 'nemesis' AND sp.subject_key = ns.person_id
    WHERE ns.nemesis_count = 0
      AND ns.event_count >= ${NEMESIS_FREE_MIN_EVENTS}
    GROUP BY ns.person_id, p.name, s.name, ns.event_count, ns.nemesized_count
    HAVING NOT (
      COALESCE(BOOL_OR(sp.platform = 'facebook'), false)
      AND COALESCE(BOOL_OR(sp.platform = 'instagram'), false)
    )
    ORDER BY p.name
    LIMIT ${limit}
  `)) as unknown as Array<{
    personId: string;
    personName: string;
    stateName: string | null;
    eventCount: number | string;
    nemesizedCount: number | string;
    facebookPosted: boolean | null;
    instagramPosted: boolean | null;
  }>;

  return rows.map((row) => ({
    subjectKey: row.personId,
    personId: row.personId,
    personName: row.personName,
    stateName: row.stateName,
    eventCount: Number(row.eventCount),
    nemesizedCount: Number(row.nemesizedCount),
    facebookPosted: Boolean(row.facebookPosted),
    instagramPosted: Boolean(row.instagramPosted),
  }));
}
