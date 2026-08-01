"use cache";

import "server-only";
import { db } from "@workspace/db";
import { competition } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export async function getCompetitionsPageData(stateId: string) {
  cacheLife("days");
  cacheTag(`team-competitions-${stateId}`);

  const competitions = await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
      venue: competition.venue,
      startDate: competition.startDate,
      endDate: competition.endDate,
      latitudeMicrodegrees: competition.latitudeMicrodegrees,
      longitudeMicrodegrees: competition.longitudeMicrodegrees,
    })
    .from(competition)
    .where(eq(competition.stateId, stateId))
    .orderBy(competition.startDate);

  return {
    competitions,
    upcomingCompetitions: competitions.filter(
      (competition) => competition.startDate >= new Date(),
    ),
    pastCompetitions: competitions.filter(
      (competition) => competition.endDate < new Date(),
    ),
  };
}
