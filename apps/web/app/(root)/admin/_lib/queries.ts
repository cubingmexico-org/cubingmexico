import "server-only";

import { streaksMonthlyKeyIfDue } from "@/lib/social-calendar-mx";

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
import { isSummaryYearPublished } from "@/app/(root)/summary/_lib/summary-year";
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

export type PersonStateGuessConfidence = "high" | "medium" | "none";

export type PersonStateGuess = {
  wcaId: string;
  name: string | null;
  suggestedStateId: string | null;
  suggestedStateName: string | null;
  suggestedComps: number;
  totalMxComps: number;
  share: number;
  firstStateId: string | null;
  confidence: PersonStateGuessConfidence;
  breakdown: string;
  countryRank333: number | null;
  competitionCount: number;
};

export async function getPersonStateGuesses({
  limit = 10,
  confidence,
}: {
  limit?: number;
  confidence?: PersonStateGuessConfidence | "all";
} = {}): Promise<PersonStateGuess[]> {
  const confidenceFilter =
    confidence && confidence !== "all"
      ? sql`WHERE confidence = ${confidence}`
      : sql``;

  const rows = (await db.execute(sql`
    WITH mx AS (
      SELECT DISTINCT
        r.person_id,
        c.state_id,
        c.id AS competition_id,
        c.start_date
      FROM results r
      JOIN competitions c ON c.id = r.competition_id
      WHERE c.country_id = 'Mexico'
        AND c.state_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM championships ch
          WHERE ch.competition_id = c.id
            AND ch.championship_type = 'MX'
        )
    ),
    counts AS (
      SELECT
        person_id,
        state_id,
        COUNT(*)::int AS comps,
        MAX(start_date) AS last_comp
      FROM mx
      GROUP BY person_id, state_id
    ),
    agg AS (
      SELECT
        person_id,
        SUM(comps)::int AS total_mx,
        MAX(last_comp) AS last_mx_comp
      FROM counts
      GROUP BY person_id
    ),
    ranked AS (
      SELECT
        c.person_id,
        c.state_id AS mode_state_id,
        c.comps AS mode_comps,
        a.total_mx,
        a.last_mx_comp,
        (c.comps::numeric / a.total_mx) AS share,
        ROW_NUMBER() OVER (
          PARTITION BY c.person_id
          ORDER BY c.comps DESC, c.last_comp DESC
        ) AS rn
      FROM counts c
      JOIN agg a ON a.person_id = c.person_id
    ),
    mode_guess AS (
      SELECT *
      FROM ranked
      WHERE rn = 1
    ),
    first_guess AS (
      SELECT DISTINCT ON (person_id)
        person_id,
        state_id AS first_state_id
      FROM mx
      ORDER BY person_id, start_date ASC
    ),
    breakdown AS (
      SELECT
        person_id,
        string_agg(
          comps::text || ' ' || state_id,
          ' · '
          ORDER BY comps DESC, state_id ASC
        ) AS breakdown
      FROM counts
      GROUP BY person_id
    ),
    all_comps AS (
      SELECT
        person_id,
        COUNT(DISTINCT competition_id)::int AS competition_count
      FROM results
      GROUP BY person_id
    ),
    candidates AS (
      SELECT
        p.wca_id AS "wcaId",
        p.name,
        mg.mode_state_id AS "suggestedStateId",
        st.name AS "suggestedStateName",
        COALESCE(mg.mode_comps, 0)::int AS "suggestedComps",
        COALESCE(mg.total_mx, 0)::int AS "totalMxComps",
        COALESCE(mg.share, 0)::float8 AS share,
        fg.first_state_id AS "firstStateId",
        COALESCE(bd.breakdown, '') AS breakdown,
        ra.country_rank AS "countryRank333",
        COALESCE(ac.competition_count, 0)::int AS "competitionCount",
        mg.last_mx_comp AS "lastMxComp",
        CASE
          WHEN (
            mg.total_mx >= 3
            AND mg.share >= 0.7
            AND fg.first_state_id = mg.mode_state_id
          )
            OR (mg.total_mx >= 2 AND mg.share = 1.0)
            THEN 'high'
          WHEN mg.total_mx >= 3 AND mg.share >= 0.5 THEN 'medium'
          ELSE 'none'
        END AS confidence
      FROM persons p
      INNER JOIN mode_guess mg ON mg.person_id = p.wca_id
      LEFT JOIN first_guess fg ON fg.person_id = p.wca_id
      LEFT JOIN breakdown bd ON bd.person_id = p.wca_id
      LEFT JOIN states st ON st.id = mg.mode_state_id
      LEFT JOIN ranks_average ra
        ON ra.person_id = p.wca_id AND ra.event_id = '333'
      LEFT JOIN all_comps ac ON ac.person_id = p.wca_id
      WHERE p.state_id IS NULL
        AND mg.total_mx > 0
    )
    SELECT
      "wcaId",
      name,
      "suggestedStateId",
      "suggestedStateName",
      "suggestedComps",
      "totalMxComps",
      share,
      "firstStateId",
      confidence,
      breakdown,
      "countryRank333",
      "competitionCount"
    FROM candidates
    ${confidenceFilter}
    ORDER BY
      CASE confidence
        WHEN 'high' THEN 0
        WHEN 'medium' THEN 1
        ELSE 2
      END ASC,
      "countryRank333" ASC NULLS LAST,
      "competitionCount" DESC,
      "lastMxComp" DESC NULLS LAST,
      "wcaId" ASC
    LIMIT ${limit}
  `)) as unknown as Array<{
    wcaId: string;
    name: string | null;
    suggestedStateId: string | null;
    suggestedStateName: string | null;
    suggestedComps: number;
    totalMxComps: number;
    share: number;
    firstStateId: string | null;
    confidence: PersonStateGuessConfidence;
    breakdown: string;
    countryRank333: number | null;
    competitionCount: number;
  }>;

  return rows.map((row) => ({
    wcaId: row.wcaId,
    name: row.name,
    suggestedStateId: row.suggestedStateId,
    suggestedStateName: row.suggestedStateName,
    suggestedComps: Number(row.suggestedComps ?? 0),
    totalMxComps: Number(row.totalMxComps ?? 0),
    share: Number(row.share ?? 0),
    firstStateId: row.firstStateId,
    confidence: row.confidence,
    breakdown: row.breakdown ?? "",
    countryRank333:
      row.countryRank333 == null ? null : Number(row.countryRank333),
    competitionCount: Number(row.competitionCount ?? 0),
  }));
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
