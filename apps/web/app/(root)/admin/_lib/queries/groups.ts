import "server-only";

import { db } from "@workspace/db";
import { group } from "@workspace/db/schema";
import { asc } from "drizzle-orm";

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
    })
    .from(group)
    .orderBy(asc(group.kind), asc(group.name));
}
