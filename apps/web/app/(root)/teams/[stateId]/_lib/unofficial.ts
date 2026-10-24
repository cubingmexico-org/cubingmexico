import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  getCcResultsSummary,
  teamMemberCcResultIds,
} from "@/lib/cubing-contests-queries";
import type { TeamMedals } from "./queries";

/**
 * All-time unofficial medals (top 3 in finals) of the team's members.
 * A team-event result counts once even when several members took part.
 */
export async function getTeamUnofficialMedals(
  stateId: string,
): Promise<TeamMedals> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `team-unofficial-medals-${stateId}`);

  const { podiums } = await getCcResultsSummary(teamMemberCcResultIds(stateId));
  return {
    ...podiums,
    total: podiums.gold + podiums.silver + podiums.bronze,
  };
}
