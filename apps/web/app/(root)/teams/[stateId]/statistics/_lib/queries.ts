import "server-only";
import { getTeamStatisticsData } from "../../_lib/queries";

export async function getStatisticsPageData(stateId: string) {
  return getTeamStatisticsData(stateId);
}
