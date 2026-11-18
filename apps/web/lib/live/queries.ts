import "server-only";

import { db } from "@workspace/db";
import { competition, state } from "@workspace/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { connection } from "next/server";

export type InProgressLiveCompetition = {
  id: string;
  name: string;
  logo: string | null;
  stateName: string | null;
  startDate: Date;
  endDate: Date;
  cityName: string | null;
};

/** Mexican competitions currently in progress (date-window, same as competitions list). */
export async function getInProgressLiveCompetitions(): Promise<
  InProgressLiveCompetition[]
> {
  await connection();

  return db
    .select({
      id: competition.id,
      name: competition.name,
      logo: competition.logo,
      stateName: state.name,
      startDate: competition.startDate,
      endDate: competition.endDate,
      cityName: competition.cityName,
    })
    .from(competition)
    .leftJoin(state, eq(competition.stateId, state.id))
    .where(
      and(
        eq(competition.countryId, "Mexico"),
        sql`
          ${competition.startDate} <= NOW()
          AND ${competition.endDate} + INTERVAL '1 day' >= NOW()
        `,
      ),
    )
    .orderBy(asc(competition.startDate), asc(competition.name));
}
