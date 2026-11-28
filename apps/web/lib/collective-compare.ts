import { GROUP_ID_REGEX } from "@/lib/groups";

export const COLLECTIVE_KINDS = ["team", "community", "sponsor"] as const;

export type CollectiveKind = (typeof COLLECTIVE_KINDS)[number];

export type CollectiveRef = {
  kind: CollectiveKind;
  id: string;
};

const TEAM_ID_REGEX = /^[A-Z]{2,3}$/;

export function isCollectiveKind(value: string): value is CollectiveKind {
  return (COLLECTIVE_KINDS as readonly string[]).includes(value);
}

/** Serialize for compare URLs, e.g. `team:JAL` or `community:vallarta`. */
export function serializeCollectiveRef(ref: CollectiveRef): string {
  return `${ref.kind}:${ref.id}`;
}

/**
 * Parse a compare query value.
 * Accepts typed refs (`team:JAL`, `community:vallarta`) and bare team state IDs (`JAL`)
 * for backward compatibility with existing `/teams/compare?a=JAL` links.
 */
export function parseCollectiveRef(
  value: string | string[] | undefined | null,
): CollectiveRef | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    const kindRaw = trimmed.slice(0, colon).toLowerCase();
    const idRaw = trimmed.slice(colon + 1).trim();
    if (!isCollectiveKind(kindRaw) || !idRaw) return null;

    if (kindRaw === "team") {
      const id = idRaw.toUpperCase();
      return TEAM_ID_REGEX.test(id) ? { kind: "team", id } : null;
    }

    const id = idRaw.toLowerCase();
    return GROUP_ID_REGEX.test(id) ? { kind: kindRaw, id } : null;
  }

  const teamId = trimmed.toUpperCase();
  if (TEAM_ID_REGEX.test(teamId)) {
    return { kind: "team", id: teamId };
  }

  return null;
}

export function collectiveRefsEqual(
  a: CollectiveRef,
  b: CollectiveRef,
): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function collectiveRefKey(ref: CollectiveRef): string {
  return serializeCollectiveRef(ref);
}

export function collectiveKindLabel(kind: CollectiveKind): string {
  switch (kind) {
    case "team":
      return "Team";
    case "community":
      return "Comunidad";
    case "sponsor":
      return "Patrocinador";
  }
}

export function buildCollectiveCompareHref(
  a: CollectiveRef | null,
  b: CollectiveRef | null,
  deprecated = false,
): string {
  const params = new URLSearchParams();
  if (a) params.set("a", serializeCollectiveRef(a));
  if (b) params.set("b", serializeCollectiveRef(b));
  if (deprecated) params.set("deprecated", "true");
  const query = params.toString();
  return query ? `/teams/compare?${query}` : "/teams/compare";
}
