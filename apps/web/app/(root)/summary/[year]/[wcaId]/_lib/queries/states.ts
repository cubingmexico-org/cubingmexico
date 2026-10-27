import "server-only";

import { db } from "@workspace/db";
import { competition, result, state } from "@workspace/db/schema";
import { and, asc, countDistinct, desc, eq, sql, type SQL } from "drizzle-orm";
import type { StateVisits } from "../summary-extra";

/** States of the person's competitions of the year (`yearCompFilter`), counting every event. */
export async function computeYearStates(
  yearCompFilter: SQL | undefined,
): Promise<StateVisits[]> {
  const stateRows = await db
    .select({
      stateId: competition.stateId,
      stateName: state.name,
      times: countDistinct(competition.id),
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(state, eq(competition.stateId, state.id))
    .where(yearCompFilter)
    .groupBy(competition.stateId, state.name)
    .orderBy(desc(countDistinct(competition.id)), asc(state.name));

  const states: StateVisits[] = stateRows
    .filter(
      (row): row is typeof row & { stateId: string } => row.stateId !== null,
    )
    .map((row) => ({
      stateId: row.stateId,
      stateName: row.stateName,
      times: Number(row.times),
    }));

  if (states.length > 0) {
    return states;
  }

  // Fallback when competitions lack state_id: match state names inside city_name
  const cityRows = await db
    .select({
      competitionId: competition.id,
      cityName: competition.cityName,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(and(yearCompFilter, eq(competition.countryId, "Mexico")))
    .groupBy(competition.id, competition.cityName);

  const allStates = await db
    .select({ id: state.id, name: state.name })
    .from(state)
    .orderBy(desc(sql`LENGTH(${state.name})`));

  const counts = new Map<string, { stateName: string; times: number }>();

  for (const row of cityRows) {
    const city = row.cityName ?? "";
    const matched = allStates.find((s) =>
      city.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (!matched) continue;
    const existing = counts.get(matched.id);
    if (existing) {
      existing.times += 1;
    } else {
      counts.set(matched.id, { stateName: matched.name, times: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([stateId, value]) => ({
      stateId,
      stateName: value.stateName,
      times: value.times,
    }))
    .sort(
      (a, b) =>
        b.times - a.times || a.stateName.localeCompare(b.stateName, "es"),
    );
}
