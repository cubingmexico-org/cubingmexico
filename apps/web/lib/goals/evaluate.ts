import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  event,
  goal,
  person,
  result,
  type Goal,
  type GoalTarget,
} from "@workspace/db/schema";
import {
  and,
  asc,
  countDistinct,
  eq,
  gte,
  inArray,
  lte,
  min,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  getAsOfPersonRanks,
  getMembershipAsOf,
  getMollerzEventIds,
} from "@/app/(root)/summary/[year]/[wcaId]/_lib/summary-extra";
import { computeYearPersonalBests } from "@/app/(root)/summary/[year]/[wcaId]/_lib/queries/personal-bests";
import { countNemesesAsOf } from "@/app/(root)/persons/_lib/nemesis-queries";
import { personGoalsTag } from "@/lib/cache-tag-names";
import { inOfficialEvents, isOfficialEvent } from "@/lib/official-events";
import { getTier } from "@/lib/utils";
import {
  describeGoal,
  describeRankProgress,
  describeResultProgress,
} from "./format";
import {
  COUNT_METRIC_LABELS,
  goalEventId,
  tierIndex,
  type CountMetric,
  type GoalView,
} from "./types";

/**
 * The day goals of `year` are evaluated at: today while the year is running,
 * Dec 31 once it's over. Returned as YYYY-MM-DD so it can be a cache key.
 */
export function goalAsOfDay(year: number, now: Date = new Date()): string {
  const yearLastDay = new Date(Date.UTC(year, 11, 31));
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const asOf = today < yearLastDay ? today : yearLastDay;
  return asOf.toISOString().slice(0, 10);
}

type Evaluation = { achieved: boolean; progress: string | null };

type Context = {
  wcaId: string;
  stateId: string | null;
  year: number;
  yearStart: Date;
  /** Competitions that started on or before this instant count. */
  asOf: Date;
  /** Lazily computed so goals that don't need them skip the queries. */
  counts: () => Promise<Record<CountMetric, number>>;
};

function memo<T>(fn: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => (promise ??= fn());
}

async function bestInYear(
  ctx: Context,
  target: Extract<GoalTarget, { type: "result" }>,
): Promise<number | null> {
  const column = target.kind === "single" ? result.best : result.average;
  const [row] = await db
    .select({ best: min(column) })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, ctx.wcaId),
        eq(result.eventId, target.eventId),
        inOfficialEvents(result.eventId),
        sql`${column} > 0`,
        gte(competition.startDate, ctx.yearStart),
        lte(competition.startDate, ctx.asOf),
      ),
    );
  return row?.best ?? null;
}

async function yearCounts(ctx: Context): Promise<Record<CountMetric, number>> {
  // Competitions and states count every result, like the annual summary;
  // event-level counts only use official events.
  const official = inOfficialEvents(result.eventId);
  const podium = sql`${official} AND ${result.roundTypeId} IN ('f', 'c') AND ${result.best} > 0`;
  const hasRecord = (regional: SQLWrapper, state: SQLWrapper) =>
    sql`${official} AND (COALESCE(${regional}, '') <> '' OR ${state} = 'SR')`;

  const [row] = await db
    .select({
      competitions: countDistinct(result.competitionId),
      states: countDistinct(competition.stateId),
      events: sql<number>`COUNT(DISTINCT ${result.eventId}) FILTER (WHERE ${official})`,
      podiums: sql<number>`COUNT(*) FILTER (WHERE ${podium} AND ${result.pos} IN (1, 2, 3))`,
      wins: sql<number>`COUNT(*) FILTER (WHERE ${podium} AND ${result.pos} = 1)`,
      records: sql<number>`COUNT(*) FILTER (WHERE ${hasRecord(result.regionalSingleRecord, result.stateSingleRecord)}) + COUNT(*) FILTER (WHERE ${hasRecord(result.regionalAverageRecord, result.stateAverageRecord)})`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, ctx.wcaId),
        gte(competition.startDate, ctx.yearStart),
        lte(competition.startDate, ctx.asOf),
      ),
    );

  const nextDay = new Date(ctx.asOf.getTime() + 24 * 60 * 60 * 1000);
  const { totalBreaks } = await computeYearPersonalBests(
    ctx.wcaId,
    ctx.yearStart,
    nextDay,
  );

  return {
    competitions: Number(row?.competitions ?? 0),
    states: Number(row?.states ?? 0),
    events: Number(row?.events ?? 0),
    podiums: Number(row?.podiums ?? 0),
    wins: Number(row?.wins ?? 0),
    records: Number(row?.records ?? 0),
    prs: totalBreaks,
  };
}

async function evaluateTarget(
  ctx: Context,
  target: GoalTarget,
  completedAt: Date | null,
): Promise<Evaluation> {
  switch (target.type) {
    case "result": {
      const best = await bestInYear(ctx, target);
      // Lower encoded multi-blind values are better, and matching the target counts.
      const achieved =
        best !== null &&
        (target.eventId === "333mbf"
          ? best <= target.value
          : best < target.value);
      return {
        achieved,
        progress: describeResultProgress(target, best, ctx.year),
      };
    }
    case "rank": {
      if (target.region === "state" && !ctx.stateId) {
        return { achieved: false, progress: "Sin estado asignado" };
      }
      const ranks = await getAsOfPersonRanks(
        ctx.wcaId,
        ctx.stateId,
        ctx.asOf,
        target.kind,
      );
      const row = ranks.get(target.eventId);
      const rank = (target.region === "national" ? row?.nr : row?.sr) ?? null;
      return {
        achieved: rank !== null && rank <= target.maxRank,
        progress: describeRankProgress(target, rank),
      };
    }
    case "count": {
      const value = (await ctx.counts())[target.metric];
      return {
        achieved: value >= target.value,
        progress: `${value} de ${target.value} ${COUNT_METRIC_LABELS[target.metric]}`,
      };
    }
    case "mollerz": {
      const conditions = await getMembershipAsOf(
        ctx.wcaId,
        await getMollerzEventIds(),
        ctx.asOf,
      );
      const tier = getTier(conditions);
      return {
        achieved: tierIndex(tier) >= tierIndex(target.tier),
        progress: tier ? `Membresía actual: ${tier}` : "Aún sin membresía",
      };
    }
    case "nemesis": {
      const { slotCount, nemesisCount } = await countNemesesAsOf(
        ctx.wcaId,
        ctx.asOf,
      );
      return {
        achieved: slotCount > 0 && nemesisCount <= target.maxNemeses,
        progress:
          slotCount === 0 ? "Aún sin resultados" : `Némesis: ${nemesisCount}`,
      };
    }
    case "custom":
      return {
        achieved: completedAt !== null,
        progress: completedAt ? "Marcada como cumplida" : null,
      };
  }
}

async function getEventNames(eventIds: string[]): Promise<Map<string, string>> {
  if (eventIds.length === 0) return new Map();
  const rows = await db
    .select({ id: event.id, name: event.name })
    .from(event)
    .where(and(inArray(event.id, eventIds), isOfficialEvent));
  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function getPersonGoals(
  wcaId: string,
  year: number,
): Promise<Goal[]> {
  return db
    .select()
    .from(goal)
    .where(and(eq(goal.personId, wcaId), eq(goal.year, year)))
    .orderBy(asc(goal.createdAt), asc(goal.id));
}

/** Every goal of the person for `year`, evaluated at `asOfDay` (see `goalAsOfDay`). */
export async function getGoalViews(
  wcaId: string,
  year: number,
  asOfDay: string,
): Promise<GoalView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(personGoalsTag(wcaId, year));

  const goals = await getPersonGoals(wcaId, year);
  if (goals.length === 0) return [];

  const [personRow] = await db
    .select({ stateId: person.stateId })
    .from(person)
    .where(eq(person.wcaId, wcaId))
    .limit(1);

  const ctx: Context = {
    wcaId,
    stateId: personRow?.stateId ?? null,
    year,
    yearStart: new Date(Date.UTC(year, 0, 1)),
    asOf: new Date(`${asOfDay}T00:00:00Z`),
    counts: memo(() => yearCounts(ctx)),
  };

  const eventNames = await getEventNames(
    goals.map((g) => goalEventId(g.target)).filter((id) => id !== null),
  );

  return Promise.all(
    goals.map(async (g) => {
      const { achieved, progress } = await evaluateTarget(
        ctx,
        g.target,
        g.completedAt,
      );
      const eventId = goalEventId(g.target);
      return {
        id: g.id,
        year: g.year,
        type: g.type,
        target: g.target,
        isPublic: g.isPublic,
        completedAt: g.completedAt?.toISOString() ?? null,
        label: describeGoal(
          g.target,
          eventId ? eventNames.get(eventId) : undefined,
        ),
        achieved,
        progress,
      };
    }),
  );
}
