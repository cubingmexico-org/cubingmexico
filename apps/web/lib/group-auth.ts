import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupMembership } from "@workspace/db/schema";
import { auth } from "@/lib/auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  canManageGroup,
  groupRoleHasPermission,
  type GroupPermission,
  type GroupRole,
} from "@/lib/group-permissions";

export type { GroupPermission, GroupRole };
export { canManageGroup, groupRoleHasPermission };

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.wcaId ?? null;
}

export async function getGroupRole(
  groupId: string,
  personId: string,
): Promise<GroupRole | null> {
  if (!personId) {
    return null;
  }

  if (isSuperadmin(personId)) {
    return "admin";
  }

  const rows = await db
    .select({ role: groupMembership.role })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.personId, personId),
      ),
    )
    .limit(1);

  const role = rows[0]?.role;
  if (role === "admin" || role === "editor") {
    return role;
  }
  return null;
}

export async function hasGroupPermission(
  groupId: string,
  personId: string,
  permission: GroupPermission,
): Promise<boolean> {
  const role = await getGroupRole(groupId, personId);
  return groupRoleHasPermission(role, permission);
}

export async function requireGroupPermission(
  groupId: string,
  permission: GroupPermission,
): Promise<{ userId: string; role: GroupRole }> {
  const userId = await getSessionUserId();
  if (!userId) {
    unauthorized();
  }

  const role = await getGroupRole(groupId, userId);
  if (!groupRoleHasPermission(role, permission)) {
    unauthorized();
  }

  return { userId, role: role! };
}
