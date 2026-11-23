import "server-only";

import { db } from "@workspace/db";
import { state, team } from "@workspace/db/schema";
import { asc, eq, isNull } from "drizzle-orm";

export async function getAdminTeams() {
  return db
    .select({
      stateId: team.stateId,
      name: team.name,
      isActive: team.isActive,
      stateName: state.name,
    })
    .from(team)
    .innerJoin(state, eq(team.stateId, state.id))
    .orderBy(asc(state.name));
}

export async function getStatesWithoutTeams() {
  return db
    .select({
      id: state.id,
      name: state.name,
    })
    .from(state)
    .leftJoin(team, eq(team.stateId, state.id))
    .where(isNull(team.stateId))
    .orderBy(asc(state.name));
}
