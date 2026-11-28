import "server-only";

import { db } from "@workspace/db";
import { group, state } from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getAdminGroups() {
  return db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      isActive: group.isActive,
      sponsorshipStatus: group.sponsorshipStatus,
      publicityEnabled: group.publicityEnabled,
      regionLabel: group.regionLabel,
      city: group.city,
      stateName: state.name,
    })
    .from(group)
    .leftJoin(state, eq(group.stateId, state.id))
    .orderBy(asc(group.kind), asc(group.name));
}
