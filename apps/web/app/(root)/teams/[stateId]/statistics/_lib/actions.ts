"use server";

import { getTeamCompetitionResults } from "./queries";

export async function loadTeamCompetitionResults(
  stateId: string,
  eventId: string,
) {
  return getTeamCompetitionResults(stateId, eventId);
}
