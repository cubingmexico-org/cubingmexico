/** Clear the current value when selecting it again (records state filter). */
export function toggleSelectedValue(current: string, value: string): string {
  return current === value ? "" : value;
}

/** Multi-blind has no average ranking; hide the single/average toggle. */
export function shouldHideRankTypeSelector(eventId: string): boolean {
  return eventId === "333mbf";
}
