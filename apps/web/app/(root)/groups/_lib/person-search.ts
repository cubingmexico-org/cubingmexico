import "server-only";

import { db } from "@workspace/db";
import { groupMembership, person } from "@workspace/db/schema";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";

/** Persons matching `search` who are not already members of `groupId`. */
export async function getPersonsNotInGroup({
  groupId,
  search,
  limit = 5,
}: {
  groupId: string;
  search: string;
  limit?: number;
}) {
  const term = search.trim();
  if (!term) {
    return [];
  }

  return db
    .select({
      id: person.wcaId,
      name: person.name,
    })
    .from(person)
    .leftJoin(
      groupMembership,
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.personId, person.wcaId),
      ),
    )
    .where(
      and(
        isNull(groupMembership.personId),
        or(
          accentInsensitiveContains(person.name, term),
          accentInsensitiveContains(person.wcaId, term),
        ),
      ),
    )
    .orderBy(asc(person.name))
    .limit(limit);
}
