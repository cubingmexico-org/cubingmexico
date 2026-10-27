import "server-only";

import { db } from "@workspace/db";
import { resultAttempts } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

/** Attempt values for each result, in attempt order. */
export async function getAttemptsByResultId(
  resultIds: string[],
): Promise<Map<string, number[]>> {
  const attempts = await db
    .select({
      resultId: resultAttempts.resultId,
      attemptNumber: resultAttempts.attemptNumber,
      value: resultAttempts.value,
    })
    .from(resultAttempts)
    .where(inArray(resultAttempts.resultId, resultIds))
    .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

  return attempts.reduce((acc, attempt) => {
    const values = acc.get(attempt.resultId) ?? [];
    values.push(attempt.value);
    acc.set(attempt.resultId, values);
    return acc;
  }, new Map<string, number[]>());
}
