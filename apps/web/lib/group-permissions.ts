export type GroupRole = "admin" | "editor";

export type GroupPermission =
  | "group.settings"
  | "group.media"
  | "group.members"
  | "group.roles"
  | "group.ranks";

const ROLE_PERMISSIONS: Record<GroupRole, readonly GroupPermission[]> = {
  admin: [
    "group.settings",
    "group.media",
    "group.members",
    "group.roles",
    "group.ranks",
  ],
  editor: ["group.settings", "group.media", "group.members"],
};

export function groupRoleHasPermission(
  role: GroupRole | null,
  permission: GroupPermission,
): boolean {
  if (!role) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageGroup(role: GroupRole | null): boolean {
  return role === "admin" || role === "editor";
}
