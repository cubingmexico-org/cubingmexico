import type { GroupKind } from "@workspace/db/schema";

export function groupBasePath(kind: GroupKind): "/communities" | "/sponsors" {
  return kind === "community" ? "/communities" : "/sponsors";
}

export function groupHref(kind: GroupKind, groupId: string): string {
  return `${groupBasePath(kind)}/${groupId}`;
}

export function groupRecordLabel(kind: GroupKind): "CR" | "SpR" {
  return kind === "community" ? "CR" : "SpR";
}

export function groupKindLabel(kind: GroupKind): string {
  return kind === "community" ? "Comunidad" : "Patrocinador";
}

export function groupKindPluralLabel(kind: GroupKind): string {
  return kind === "community" ? "Comunidades" : "Patrocinadores";
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
