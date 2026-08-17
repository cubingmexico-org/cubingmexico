import { sql } from "drizzle-orm";
import { competition, competitionRoundDate } from "@workspace/db/schema";

/**
 * Calendar day used for WCA 9i2: last local day of the round when stored,
 * otherwise the competition start date.
 */
export const recordDateSql = sql<
  Date | string
>`COALESCE(${competitionRoundDate.endDate}, (${competition.startDate})::date)`;

/** YYYY-MM-DD without local timezone day shifts. */
export function toDateKey(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
