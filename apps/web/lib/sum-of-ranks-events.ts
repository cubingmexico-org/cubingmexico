import { SPECIALTY_EVENT_IDS } from "@/lib/constants";

/** Event columns before filter cols; 333mbf is appended after filters when single. */
export function getSumOfRanksBaseEventIds(): string[] {
  return SPECIALTY_EVENT_IDS.filter((id) => id !== "333mbf");
}
