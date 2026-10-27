"use server";

import { getCurrentUserTeam } from "@/db/queries";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";

export type HeaderContext = {
  team: { id: string; name: string } | null;
  isSuperadmin: boolean;
};

/** The signed-in person's team and superadmin flag, read from the session. */
export async function getHeaderContextAction(): Promise<HeaderContext | null> {
  const wcaId = await getSessionUserId();
  if (!wcaId) {
    return null;
  }
  const team = await getCurrentUserTeam({ userId: wcaId });
  return { team: team ?? null, isSuperadmin: isSuperadmin(wcaId) };
}
