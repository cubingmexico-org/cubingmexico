"use server";

import { getCurrentUserTeam } from "@/db/queries";
import { getPersonGroups } from "@/app/(root)/groups/_lib/queries";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";

export type HeaderContext = {
  team: { id: string; name: string } | null;
  communities: Array<{ id: string; name: string }>;
  isSuperadmin: boolean;
};

/** The signed-in person's team, communities, and superadmin flag. */
export async function getHeaderContextAction(): Promise<HeaderContext | null> {
  const wcaId = await getSessionUserId();
  if (!wcaId) {
    return null;
  }
  const [team, groups] = await Promise.all([
    getCurrentUserTeam({ userId: wcaId }),
    getPersonGroups(wcaId),
  ]);
  const communities = groups
    .filter((g) => g.kind === "community")
    .map((g) => ({ id: g.id, name: g.name }));
  return {
    team: team ?? null,
    communities,
    isSuperadmin: isSuperadmin(wcaId),
  };
}
