import "server-only";
import { db } from "@workspace/db";
import { ccPerson, ccResult, ccResultPerson } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { CcEventResultsGroup } from "@/lib/cubing-contests";
import {
  getCcResultRows,
  groupCcResultsByEvent,
} from "@/lib/cubing-contests-queries";

function personResultIds(wcaId: string) {
  return db
    .select({ resultId: ccResultPerson.resultId })
    .from(ccResultPerson)
    .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
    .where(eq(ccPerson.wcaId, wcaId));
}

export async function hasPersonUnofficialResults(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const rows = await personResultIds(wcaId).limit(1);
  return rows.length > 0;
}

/** Every unofficial result of the person, grouped by event, newest first within each event. */
export async function getPersonUnofficialResults(
  wcaId: string,
): Promise<CcEventResultsGroup[]> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `person-unofficial-${wcaId}`);

  const rows = await getCcResultRows(
    inArray(ccResult.id, personResultIds(wcaId)),
  );
  return groupCcResultsByEvent(rows).map((group) => ({
    ...group,
    results: group.results
      .slice()
      .sort(
        (a, b) =>
          b.date.getTime() - a.date.getTime() || b.roundNumber - a.roundNumber,
      ),
  }));
}
