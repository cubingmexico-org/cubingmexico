import "server-only";

/** Pending posts about one person: MOLLERZ and NÉMESIS. */

import { db } from "@workspace/db";
import { socialPost } from "@workspace/db/schema";
import {
  BLD_FMC_MEANS_EVENTS,
  OFFICIAL_EVENT_MAX_RANK,
  SPEEDSOLVING_AVERAGES_EVENTS,
} from "@/lib/constants";
import { getTier } from "@/lib/utils";
import type { Tier } from "@/types";
import { eq, sql } from "drizzle-orm";

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
        SELECT id FROM events WHERE rank < ${OFFICIAL_EVENT_MAX_RANK}
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
    WHERE ns.scope = 'official'
      AND ns.nemesis_count = 0
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
