import type { TeamResultsEventOption } from "./queries";

/** The `?event=` param when the team has results in it; otherwise 3x3x3, or the first event. */
export function selectedTeamResultsEventId(
  eventOptions: TeamResultsEventOption[],
  requestedEventId: string | null,
): string {
  return (
    eventOptions.find((option) => option.eventId === requestedEventId)
      ?.eventId ??
    eventOptions.find((option) => option.eventId === "333")?.eventId ??
    eventOptions[0]?.eventId ??
    ""
  );
}
