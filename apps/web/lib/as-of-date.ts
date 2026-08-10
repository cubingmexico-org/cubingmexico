import { competition } from "@workspace/db/schema";
import { lte } from "drizzle-orm";

const AS_OF_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse `YYYY-MM-DD` into an inclusive end-of-day UTC Date. */
export function parseAsOfDate(
  asOf: string | null | undefined,
): Date | undefined {
  if (!asOf) return undefined;
  if (!AS_OF_DATE_RE.test(asOf)) return undefined;

  const date = new Date(`${asOf}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Drizzle condition: competition.startDate <= asOf (inclusive). */
export function competitionAsOfCondition(asOf: string | null | undefined) {
  const date = parseAsOfDate(asOf);
  if (!date) return undefined;
  return lte(competition.startDate, date);
}

export function formatAsOfParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
