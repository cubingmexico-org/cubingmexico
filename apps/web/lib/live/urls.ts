import { wcaOrigin } from "@workspace/wca";
import type { ScoretakingSoftware } from "./types";

/** Official WCA ILR spectator URL for a competition. */
export function wcaIlrLiveUrl(competitionId: string): string {
  return `${wcaOrigin()}/competitions/${competitionId}/live`;
}

/** Legacy standalone WCA Live deep link. */
export function wcaClassicLiveUrl(competitionId: string): string {
  return `https://live.worldcubeassociation.org/link/competitions/${competitionId}`;
}

/** Cubing México spectator URL. */
export function cubingMexicoLiveUrl(competitionId: string): string {
  return `/live/${competitionId}`;
}

/**
 * Pick the best official (WCA) deep link for scoretaking software.
 * Cubing México's own `/live/{id}` is separate and preferred in-app when in progress.
 */
export function officialLiveUrl(
  competitionId: string,
  scoretakingSoftware: ScoretakingSoftware | null | undefined,
): string {
  if (scoretakingSoftware === "wca_live") {
    return wcaClassicLiveUrl(competitionId);
  }
  if (scoretakingSoftware === "internal" || scoretakingSoftware == null) {
    return wcaIlrLiveUrl(competitionId);
  }
  return `${wcaOrigin()}/competitions/${competitionId}`;
}

/**
 * In-app "En vivo" link for the competitions table.
 * Always routes to Cubing México live.
 */
export function competitionsTableLiveHref(competitionId: string): string {
  return cubingMexicoLiveUrl(competitionId);
}

/**
 * Classic standalone WCA Live (not ILR). Cubing México `/live` only works with
 * internal scoretaking; WCA Live is scheduled for deprecation in 2027.
 */
export function usesClassicWcaLive(
  scoretakingSoftware: ScoretakingSoftware | null | undefined,
): boolean {
  return scoretakingSoftware === "wca_live";
}

export function parseScoretakingSoftware(
  value: unknown,
): ScoretakingSoftware | null {
  if (value === "external" || value === "wca_live" || value === "internal") {
    return value;
  }
  return null;
}
