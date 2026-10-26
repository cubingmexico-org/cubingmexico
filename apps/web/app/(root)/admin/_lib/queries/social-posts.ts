import "server-only";

/** The `social_posts` ledger: history, stats and deletes. */

import { db } from "@workspace/db";
import { competition, socialPost } from "@workspace/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";

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
