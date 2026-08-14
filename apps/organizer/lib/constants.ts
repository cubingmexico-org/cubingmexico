/** Cubing México web app (`apps/web`). Local default: http://localhost:3000 */
export const WEB_APP_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "https://www.cubingmexico.net";

/**
 * Preview modules (Mesa, Grupos). Off in production until public release.
 * `next dev` enables them unless the env var is explicitly `"false"`.
 */
function isPreviewModuleEnabled(value: string | undefined): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const DESK_ENABLED = isPreviewModuleEnabled(
  process.env.NEXT_PUBLIC_DESK_ENABLED,
);

export const GROUPS_ENABLED = isPreviewModuleEnabled(
  process.env.NEXT_PUBLIC_GROUPS_ENABLED,
);
