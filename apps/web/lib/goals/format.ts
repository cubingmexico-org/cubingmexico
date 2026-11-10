import { formatAttemptValue } from "@/lib/utils";
import { COUNT_METRIC_LABELS, type GoalTarget } from "./types";

const KIND_LABELS = { single: "Single", average: "Promedio" } as const;

function formatGoalValue(
  eventId: string,
  kind: "single" | "average",
  value: number,
): string {
  return formatAttemptValue(eventId, value, kind) ?? String(value);
}

/** "3 podios" or "3 podios en 3x3x3 Cube" for podiums limited to one event. */
export function describeCount(
  target: Extract<GoalTarget, { type: "count" }>,
  value: number,
  eventName?: string,
): string {
  const label = `${value} ${COUNT_METRIC_LABELS[target.metric]}`;
  return target.eventId ? `${label} en ${eventName ?? target.eventId}` : label;
}

/** Spanish sentence for a goal. `eventName` is required for goals with an event. */
export function describeGoal(target: GoalTarget, eventName?: string): string {
  switch (target.type) {
    case "result": {
      const value = formatGoalValue(target.eventId, target.kind, target.value);
      const event = eventName ?? target.eventId;
      return target.eventId === "333mbf"
        ? `${KIND_LABELS[target.kind]} de ${event} de al menos ${value}`
        : `${KIND_LABELS[target.kind]} de ${event} debajo de ${value}`;
    }
    case "rank": {
      const region = target.region === "national" ? "nacional" : "estatal";
      return `Top ${target.maxRank} ${region} en ${KIND_LABELS[target.kind].toLowerCase()} de ${eventName ?? target.eventId}`;
    }
    case "count":
      return `${describeCount(target, target.value, eventName)} en el año`;
    case "mollerz":
      return `Membresía Mollerz ${target.tier} o superior`;
    case "nemesis":
      return target.maxNemeses === 0
        ? "Terminar el año sin némesis"
        : `Terminar el año con ${target.maxNemeses} némesis o menos`;
    case "kinch":
      return `Kinch de al menos ${target.minScore.toFixed(2)}`;
    case "sor":
      return `Sum of Ranks (${target.kind}) de ${target.maxSum} o menos`;
    case "custom":
      return target.text;
  }
}

/** "best average this year" line, or null when there's no result yet. */
export function describeResultProgress(
  target: Extract<GoalTarget, { type: "result" }>,
  best: number | null,
  year: number,
): string {
  if (best === null) {
    return `Sin ${target.kind === "single" ? "singles" : "promedios"} en ${year}`;
  }
  const label = target.kind === "single" ? "Mejor single" : "Mejor promedio";
  return `${label} en ${year}: ${formatGoalValue(target.eventId, target.kind, best)}`;
}

export function describeRankProgress(
  target: Extract<GoalTarget, { type: "rank" }>,
  rank: number | null,
): string {
  if (rank === null) return "Sin lugar en el ranking";
  const region = target.region === "national" ? "nacional" : "estatal";
  return `Lugar ${region}: ${rank}`;
}
