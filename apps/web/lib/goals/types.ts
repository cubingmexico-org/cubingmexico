import type { GoalTarget, GoalType } from "@workspace/db/schema";
import type { Tier } from "@/types";
import { z } from "zod";

export type { GoalTarget, GoalType };

export const MAX_GOALS_PER_YEAR = 10;
export const MAX_CUSTOM_GOAL_LENGTH = 140;

/** Lowest to highest. */
export const MOLLERZ_TIERS = [
  "Bronce",
  "Plata",
  "Oro",
  "Platino",
  "Ópalo",
  "Diamante",
] as const satisfies readonly Tier[];

export const COUNT_METRICS = [
  "competitions",
  "podiums",
  "wins",
  "states",
  "newStates",
  "events",
  "prs",
  "records",
] as const;

export type CountMetric = (typeof COUNT_METRICS)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  result: "Tiempo o resultado",
  rank: "Ranking",
  count: "Actividad",
  mollerz: "Membresía Mollerz",
  nemesis: "Némesis",
  kinch: "Kinch",
  sor: "Sum of Ranks",
  custom: "Personalizada",
};

export const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS) as GoalType[];

export const COUNT_METRIC_LABELS: Record<CountMetric, string> = {
  competitions: "competencias",
  podiums: "podios",
  wins: "primeros lugares",
  states: "estados visitados",
  newStates: "estados nuevos",
  events: "eventos distintos",
  prs: "récords personales",
  records: "récords (SR, NR, CR o WR)",
};

const eventId = z.string().min(1).max(10);
const kind = z.enum(["single", "average"]);
const positiveInt = z.coerce.number().int().positive();

/** Count metrics that can be limited to one event. */
export const EVENT_COUNT_METRICS: readonly CountMetric[] = ["podiums"];

export const goalTargetSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("result"),
      eventId,
      kind,
      value: positiveInt,
    }),
    z.object({
      type: z.literal("rank"),
      eventId,
      kind,
      region: z.enum(["national", "state"]),
      maxRank: positiveInt.max(100_000),
    }),
    z.object({
      type: z.literal("count"),
      metric: z.enum(COUNT_METRICS),
      value: positiveInt.max(1000),
      eventId: eventId.optional(),
    }),
    z.object({
      type: z.literal("mollerz"),
      tier: z.enum(MOLLERZ_TIERS),
    }),
    z.object({
      type: z.literal("nemesis"),
      maxNemeses: z.coerce.number().int().min(0).max(1000),
    }),
    z.object({
      type: z.literal("kinch"),
      minScore: z.coerce.number().positive().max(100),
    }),
    z.object({
      type: z.literal("sor"),
      kind,
      maxSum: positiveInt.max(1_000_000),
    }),
    z.object({
      type: z.literal("custom"),
      text: z.string().trim().min(1).max(MAX_CUSTOM_GOAL_LENGTH),
    }),
  ])
  .refine(
    (target) =>
      target.type !== "count" ||
      target.eventId === undefined ||
      EVENT_COUNT_METRICS.includes(target.metric),
    { message: "Only podium goals can be limited to one event" },
  ) satisfies z.ZodType<GoalTarget>;

/** Goals that point at a specific event. */
export function goalEventId(target: GoalTarget): string | null {
  if (target.type === "result" || target.type === "rank") {
    return target.eventId;
  }
  if (target.type === "count") return target.eventId ?? null;
  return null;
}

export function tierIndex(tier: Tier | null): number {
  return tier ? MOLLERZ_TIERS.indexOf(tier) : -1;
}

/** The goal as seen by the UI, with its evaluated progress. */
export type GoalView = {
  id: string;
  year: number;
  type: GoalType;
  target: GoalTarget;
  isPublic: boolean;
  completedAt: string | null;
  /** Spanish sentence describing the goal, e.g. "Promedio de 3x3x3 Cube debajo de 10.00". */
  label: string;
  achieved: boolean;
  /** Spanish description of where the person stands, e.g. "Mejor promedio en 2027: 10.42". */
  progress: string | null;
};
