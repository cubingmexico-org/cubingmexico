"use cache";

import "server-only";
import { db } from "@workspace/db";
import { person } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export async function getProfile(userId: string) {
  cacheLife("max");
  cacheTag(`profile-person-${userId}`);

  const persons = await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      gender: person.gender,
      stateId: person.stateId,
    })
    .from(person)
    .where(eq(person.wcaId, userId));

  return persons.length > 0 ? persons[0] : null;
}
