import type { StatsWindow } from "@/lib/search-params";
import { median } from "./cutoff";

export type EventRecommendation =
  | "more_rounds"
  | "frequency"
  | "over_offered"
  | "balanced";

/** Below this many team members competing, the shares are too noisy to judge. */
export const MIN_MEMBERS_FOR_RECOMMENDATION = 3;
/** Coverage below this marks the event as offered too little for its interest. */
export const UNDER_SERVED_COVERAGE = 0.8;
/** Coverage above this marks the event as offered more than its interest. */
export const OVER_SERVED_COVERAGE = 1.25;

export type RecommendationInput = {
  members: number;
  /** Share of the team's active members who compete in this event. */
  demandShare: number;
  /**
   * Of the times members attended a competition holding this event, the share
   * in which they competed in it. Unlike `demandShare`, it doesn't grow just
   * because the event is held often.
   */
  interest: number | null;
  /** Share of the competitions hosted in the state that include this event. */
  supplyShare: number;
};

export type RecommendationResult = {
  /**
   * `supplyShare / interest` over the median of that ratio across the team's
   * events held in the state: 1 is typical, lower is offered too little.
   */
  coverage: number | null;
  recommendation: EventRecommendation | null;
};

function isEligible(
  input: RecommendationInput,
): input is RecommendationInput & { interest: number } {
  return (
    input.members >= MIN_MEMBERS_FOR_RECOMMENDATION &&
    input.interest !== null &&
    input.interest > 0
  );
}

/**
 * Events are judged against each other, so universal events like 3x3 aren't
 * flagged just because everyone competes in them. An event only counts as
 * offered too much when its interest is also below the team's typical
 * interest; over-offered events that still look popular are flagged as
 * popular because of their frequency.
 */
export function recommendEvents(
  inputs: RecommendationInput[],
): RecommendationResult[] {
  const eligible = inputs.filter(isEligible);
  const held = eligible.filter((i) => i.supplyShare > 0);
  const typicalRatio =
    held.length > 0
      ? median(held.map((i) => i.supplyShare / i.interest))
      : null;
  const typicalDemand =
    eligible.length > 0 ? median(eligible.map((i) => i.demandShare)) : null;
  const typicalInterest =
    eligible.length > 0 ? median(eligible.map((i) => i.interest)) : null;

  return inputs.map((input) => {
    if (!isEligible(input)) return { coverage: null, recommendation: null };
    if (input.supplyShare === 0 || typicalRatio === null) {
      return { coverage: 0, recommendation: "more_rounds" };
    }

    const coverage = input.supplyShare / input.interest / typicalRatio;
    if (coverage < UNDER_SERVED_COVERAGE) {
      return { coverage, recommendation: "more_rounds" };
    }
    if (
      coverage > OVER_SERVED_COVERAGE &&
      typicalInterest !== null &&
      input.interest < typicalInterest
    ) {
      const popular =
        typicalDemand !== null && input.demandShare >= typicalDemand;
      return {
        coverage,
        recommendation: popular ? "frequency" : "over_offered",
      };
    }
    return { coverage, recommendation: "balanced" };
  });
}

export const RECOMMENDATION_LABELS: Record<EventRecommendation, string> = {
  more_rounds: "Necesita más rondas",
  frequency: "Popular por frecuencia",
  over_offered: "Más oferta que interés",
  balanced: "Bien cubierto",
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
