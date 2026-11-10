import type { StatsWindow } from "@/lib/search-params";

export type EventRecommendation =
  | "more_rounds"
  | "balanced"
  | "overrepresented";

/** Below this many team members competing, the shares are too noisy to judge. */
export const MIN_MEMBERS_FOR_RECOMMENDATION = 3;
/** Coverage (`supplyShare / demandShare`) below this marks the event as under-served. */
export const UNDER_SERVED_COVERAGE = 0.67;
/** Coverage above this marks the event as over-represented. */
export const OVER_SERVED_COVERAGE = 1.5;
/** Ignore coverage differences smaller than this many share points. */
export const MIN_GAP = 0.005;

export type RecommendationInput = {
  members: number;
  /** This event's share of all member-event participations (shares sum to 1). */
  demandShare: number;
  /** This event's share of all rounds hosted in the state (shares sum to 1). */
  supplyShare: number;
};

export type RecommendationResult = {
  gap: number;
  coverage: number | null;
  recommendation: EventRecommendation | null;
};

export function recommendEvent({
  members,
  demandShare,
  supplyShare,
}: RecommendationInput): RecommendationResult {
  const gap = demandShare - supplyShare;
  const coverage = demandShare > 0 ? supplyShare / demandShare : null;

  if (members < MIN_MEMBERS_FOR_RECOMMENDATION || coverage === null) {
    return { gap, coverage, recommendation: null };
  }

  if (coverage < UNDER_SERVED_COVERAGE && gap >= MIN_GAP) {
    return { gap, coverage, recommendation: "more_rounds" };
  }
  if (coverage > OVER_SERVED_COVERAGE && -gap >= MIN_GAP) {
    return { gap, coverage, recommendation: "overrepresented" };
  }
  return { gap, coverage, recommendation: "balanced" };
}

export const RECOMMENDATION_LABELS: Record<EventRecommendation, string> = {
  more_rounds: "Necesita más rondas",
  balanced: "Bien cubierto",
  overrepresented: "Sobrerrepresentado",
};

/** First day of the current UTC month minus 24 months, so cache keys only change monthly. */
export function windowSince(
  window: StatsWindow,
  now = new Date(),
): string | null {
  if (window === "all") return null;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24, 1))
    .toISOString()
    .slice(0, 10);
}
