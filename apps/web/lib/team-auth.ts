import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person, teamMember } from "@workspace/db/schema";
import { auth } from "@/lib/auth";

export type TeamRole = "admin" | "editor";

export type TeamPermission =
  | "team.settings"
  | "team.media"
  | "team.members"
  | "team.roles"
  | "team.ranks";

const ROLE_PERMISSIONS: Record<TeamRole, readonly TeamPermission[]> = {
  admin: [
    "team.settings",
    "team.media",
    "team.members",
    "team.roles",
    "team.ranks",
  ],
  editor: ["team.settings", "team.media", "team.members"],
};

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.wcaId ?? null;
}

export async function getTeamRole(
  stateId: string,
  personId: string,
): Promise<TeamRole | null> {
  if (!personId) {
    return null;
  }

  try {
    const rows = await db
      .select({
        role: teamMember.role,
      })
      .from(person)
      .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
      .where(and(eq(person.stateId, stateId), eq(person.wcaId, personId)))
      .limit(1);

    const role = rows[0]?.role;
    if (role === "admin" || role === "editor") {
      return role;
    }
    return null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function roleHasPermission(
  role: TeamRole | null,
  permission: TeamPermission,
): boolean {
  if (!role) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function hasTeamPermission(
  stateId: string,
  personId: string,
  permission: TeamPermission,
): Promise<boolean> {
  const role = await getTeamRole(stateId, personId);
  return roleHasPermission(role, permission);
}

export async function requireTeamPermission(
  stateId: string,
  permission: TeamPermission,
): Promise<{ userId: string; role: TeamRole }> {
  const userId = await getSessionUserId();
  if (!userId) {
    unauthorized();
  }

  const role = await getTeamRole(stateId, userId);
  if (!roleHasPermission(role, permission)) {
    unauthorized();
  }

  return { userId, role: role! };
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === "admin" || role === "editor";
}
