import { eventNames } from "@/lib/constants";
import { formatAttemptValue } from "@/lib/utils";

const ROUND_ID_RE = /^(.+)-r(\d+)$/;

export function parseLiveRoundId(
  roundId: string,
): { eventId: string; roundNumber: number } | null {
  const match = ROUND_ID_RE.exec(roundId);
  if (!match) return null;
  return {
    eventId: match[1]!,
    roundNumber: Number(match[2]),
  };
}

export function liveRoundEventId(roundId: string): string {
  return parseLiveRoundId(roundId)?.eventId ?? roundId;
}

export function liveRoundLabel(roundId: string): string {
  const parsed = parseLiveRoundId(roundId);
  if (!parsed) return roundId;
  const eventName = eventNames[parsed.eventId] ?? parsed.eventId;
  return `${eventName} · Ronda ${parsed.roundNumber}`;
}

export function liveRoundStateLabel(state: string): string {
  switch (state) {
    case "open":
      return "En curso";
    case "locked":
      return "Cerrada";
    default:
      return state;
  }
}

/**
 * WCA's live rounds list often omits `completed_competitors` for locked
 * rounds while still sending `total_competitors`. Treat that as fully
 * complete so the list does not show "0/N resultados".
 */
export function liveRoundCompletedCount(round: {
  state: string;
  completed_competitors?: number | null;
  total_competitors?: number | null;
}): number {
  if (round.completed_competitors != null) {
    return round.completed_competitors;
  }
  if (round.state === "locked") {
    return round.total_competitors ?? 0;
  }
  return 0;
}

export function formatLiveResultValue(
  eventId: string,
  value: number | null | undefined,
  resultType: "single" | "average" = "single",
): string {
  if (value == null || value === 0) return "—";
  return formatAttemptValue(eventId, value, resultType) ?? "—";
}

export function formatRecordTag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  return tag;
}
