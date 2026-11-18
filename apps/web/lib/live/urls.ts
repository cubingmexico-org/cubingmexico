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
 * In-progress comps go to Cubing México live; others to official ILR.
 */
export function competitionsTableLiveHref(
  competitionId: string,
  status: "past" | "in_progress" | "upcoming",
): string {
  if (status === "in_progress") {
    return cubingMexicoLiveUrl(competitionId);
  }
  return wcaIlrLiveUrl(competitionId);
}

export function parseScoretakingSoftware(
  value: unknown,
): ScoretakingSoftware | null {
  if (value === "external" || value === "wca_live" || value === "internal") {
    return value;
  }
  return null;
}
