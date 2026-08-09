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

export function roleHasPermission(
  role: TeamRole | null,
  permission: TeamPermission,
): boolean {
  if (!role) {
    return false;
  }
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === "admin" || role === "editor";
}
