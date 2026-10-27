import "server-only";

import * as Sentry from "@sentry/nextjs";
import { db } from "@workspace/db";
import { competition, team } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import { uploadThingFileKey } from "@/lib/uploadthing-key";

async function isStillReferenced(url: string): Promise<boolean> {
  const [teamRows, competitionRows] = await Promise.all([
    db
      .select({ stateId: team.stateId })
      .from(team)
      .where(or(eq(team.image, url), eq(team.coverImage, url)))
      .limit(1),
    db
      .select({ id: competition.id })
      .from(competition)
      .where(eq(competition.logo, url))
      .limit(1),
  ]);
  return teamRows.length > 0 || competitionRows.length > 0;
}

/**
 * Deletes a replaced or removed image from UploadThing. Call it after the new value is saved.
 * Never throws: the user's change already succeeded, so a failed cleanup is only reported.
 */
export async function deleteUploadedFileIfUnused(
  url: string | null | undefined,
): Promise<void> {
  const key = uploadThingFileKey(url);
  if (!key || !url || !process.env.UPLOADTHING_TOKEN) return;

  try {
    if (await isStillReferenced(url)) return;
    const { success } = await new UTApi().deleteFiles(key);
    if (!success) {
      throw new Error(`UploadThing did not delete ${key}`);
    }
  } catch (error) {
    Sentry.captureException(error, { extra: { url } });
  }
}
