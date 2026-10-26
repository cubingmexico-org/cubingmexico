import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  exportMetadata,
  jobRun,
  person,
  socialPost,
} from "@workspace/db/schema";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";

export async function getRecentJobRuns(limit = 10) {
  return await db
    .select({
      id: jobRun.id,
      job: jobRun.job,
      status: jobRun.status,
      steps: jobRun.steps,
      resumedFrom: jobRun.resumedFrom,
      error: jobRun.error,
      startedAt: jobRun.startedAt,
      finishedAt: jobRun.finishedAt,
    })
    .from(jobRun)
    .orderBy(desc(jobRun.startedAt))
    .limit(limit);
}

export async function getExportMetadata() {
  return await db
    .select({
      key: exportMetadata.key,
      value: exportMetadata.value,
      updatedAt: exportMetadata.updatedAt,
    })
    .from(exportMetadata)
    .orderBy(asc(exportMetadata.key));
}

export async function getAdminOverviewCounts() {
  const [personsWithoutState] = await db
    .select({ value: count() })
    .from(person)
    .where(isNull(person.stateId));

  const [compsMissingState] = await db
    .select({ value: count() })
    .from(competition)
    .where(
      and(eq(competition.countryId, "Mexico"), isNull(competition.stateId)),
    );

  const [socialPostsTotal] = await db
    .select({ value: count() })
    .from(socialPost);

  return {
    personsWithoutState: personsWithoutState?.value ?? 0,
    compsMissingState: compsMissingState?.value ?? 0,
    socialPostsTotal: socialPostsTotal?.value ?? 0,
  };
}
