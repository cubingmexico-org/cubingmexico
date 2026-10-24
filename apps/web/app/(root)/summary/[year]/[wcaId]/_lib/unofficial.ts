import "server-only";
import { db } from "@workspace/db";
import { ccPerson, ccResultPerson } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { CcYearSummary } from "@/lib/cubing-contests";
import { getCcYearSummary } from "@/lib/cubing-contests-queries";

/** The person's unofficial results in the year; kept apart from the official summary. */
export async function getPersonYearUnofficial(
  wcaId: string,
  year: number,
): Promise<CcYearSummary> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-summary-unofficial-${wcaId}-${year}`);

  const resultIds = db
    .select({ resultId: ccResultPerson.resultId })
    .from(ccResultPerson)
    .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
    .where(eq(ccPerson.wcaId, wcaId));
  return getCcYearSummary(resultIds, year);
}
