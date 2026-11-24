import type { GroupKind } from "@workspace/db/schema";

/** Communities directory, nav, sitemap, and search are public. */
export const COMMUNITIES_PUBLICLY_RELEASED = true;

/**
 * Sponsors directory, nav, sitemap, search, and home/footer promo stay gated
 * until public launch; superadmins can still open routes via the layout gate.
 */
export const SPONSORS_PUBLICLY_RELEASED = false;

export function isGroupKindPubliclyReleased(kind: GroupKind): boolean {
  return kind === "community"
    ? COMMUNITIES_PUBLICLY_RELEASED
    : SPONSORS_PUBLICLY_RELEASED;
}

export function canShowGroupsLinks(isSuperadmin = false): boolean {
  return (
    COMMUNITIES_PUBLICLY_RELEASED || SPONSORS_PUBLICLY_RELEASED || isSuperadmin
  );
}

export function groupBasePath(kind: GroupKind): "/communities" | "/sponsors" {
  return kind === "community" ? "/communities" : "/sponsors";
}

export function groupHref(kind: GroupKind, groupId: string): string {
  return `${groupBasePath(kind)}/${groupId}`;
}

/** Record code shown in UI; communities omit a code (avoid clashing with WCA CR). */
export function groupRecordLabel(kind: GroupKind): "SpR" | null {
  return kind === "community" ? null : "SpR";
}

export function groupKindLabel(kind: GroupKind): string {
  return kind === "community" ? "Comunidad" : "Patrocinador";
}

export function groupKindPluralLabel(kind: GroupKind): string {
  return kind === "community" ? "Comunidades locales" : "Patrocinadores";
}

export const GROUP_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derive a URL slug from a display name (lowercase, ASCII, hyphenated). */
export function groupIdFromName(name: string, maxLength = 32): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug;
}
