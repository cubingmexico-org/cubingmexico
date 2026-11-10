import "server-only";

import { db } from "@workspace/db";
import { goal } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

/** Years the person has set goals for, newest first. */
export async function getPersonGoalYears(wcaId: string): Promise<number[]> {
  const rows = await db
    .selectDistinct({ year: goal.year })
    .from(goal)
    .where(eq(goal.personId, wcaId))
    .orderBy(desc(goal.year));
  return rows.map((row) => row.year);
}
