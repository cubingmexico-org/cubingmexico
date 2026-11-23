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
    case "ready":
      return "Lista";
    case "pending":
      return "Pendiente";
    default:
      return state;
  }
}

type LiveRoundCountFields = {
  state: string;
  completed_competitors?: number | null;
  total_competitors?: number | null;
};

/**
 * WCA's live rounds list often omits `completed_competitors` for locked
 * rounds while still sending `total_competitors`. Treat that as fully
 * complete so the list does not show "0/N resultados".
 */
export function liveRoundCompletedCount(round: LiveRoundCountFields): number {
  if (round.completed_competitors != null) {
    return round.completed_competitors;
  }
  if (round.state === "locked") {
    return round.total_competitors ?? 0;
  }
  return 0;
}

/**
 * WCA `open` means the round was opened for scoretaking and is not locked —
 * finals often stay `open` forever after N/N. For spectators, only incomplete
 * open rounds count as actively in progress.
 */
export function isLiveRoundInProgress(round: LiveRoundCountFields): boolean {
  if (round.state !== "open") return false;
  const total = round.total_competitors ?? 0;
  if (total <= 0) return false;
  return liveRoundCompletedCount(round) < total;
}

/** Spectator-facing badge label (not raw WCA lifecycle state). */
export function liveRoundSpectatorLabel(round: LiveRoundCountFields): string {
  if (isLiveRoundInProgress(round)) return "En curso";
  if (round.state === "locked") return "Cerrada";
  if (round.state === "open") return "Completada";
  return liveRoundStateLabel(round.state);
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
