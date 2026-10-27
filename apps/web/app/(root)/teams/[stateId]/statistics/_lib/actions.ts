"use server";

import { getTeamCompetitionResults } from "./queries";
import { requireEventId, requireStateId } from "@/lib/action-input";

export async function loadTeamCompetitionResults(
  stateId: string,
  eventId: string,
) {
  return getTeamCompetitionResults(
    requireStateId(stateId),
    requireEventId(eventId),
  );
}
