/** Clear the current value when selecting it again (records state filter). */
export function toggleSelectedValue(current: string, value: string): string {
  return current === value ? "" : value;
}

/** Multi-blind has no average ranking; hide the single/average toggle. */
export function shouldHideRankTypeSelector(eventId: string): boolean {
  return eventId === "333mbf";
}

/**
 * Rank type to link to for an event. `/rankings/333mbf/average` only redirects,
 * and client navigations to it make the router refetch it in a loop.
 */
export function rankTypeForEvent(
  eventId: string,
  rankType: "single" | "average",
): "single" | "average" {
  return shouldHideRankTypeSelector(eventId) ? "single" : rankType;
}
