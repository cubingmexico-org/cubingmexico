"use server";

import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  result,
  roundType,
} from "@workspace/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getErrorMessage } from "@/lib/handle-error";
import { requireSuperadmin } from "@/lib/superadmin";
import { extractRoundEndDatesFromWcif } from "@/lib/competition-round-dates";
import { competitionIdSchema } from "./schemas";

function invalidateCompetitionScheduleTags(competitionId: string) {
  updateTag("competitions");
  updateTag(`competition-schedule-${competitionId}`);
}

async function getCompetitionForSchedule(competitionId: string) {
  const existing = await db
    .select({
      id: competition.id,
      countryId: competition.countryId,
      name: competition.name,
      stateId: competition.stateId,
    })
    .from(competition)
    .where(eq(competition.id, competitionId))
    .limit(1);

  if (existing.length === 0) {
    return { error: "Competencia no encontrada" as const, row: null };
  }

  const [resultsCount] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(result)
    .where(eq(result.competitionId, competitionId));

  if ((resultsCount?.value ?? 0) === 0) {
    return {
      error: "La competencia aún no tiene resultados subidos" as const,
      row: null,
    };
  }

  return { error: null, row: existing[0]! };
}

async function fetchPublicWcif(competitionId: string) {
  const response = await fetch(
    `https://www.worldcubeassociation.org/api/v0/competitions/${competitionId}/wcif/latest`,
    { cache: "no-store" },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`WCIF HTTP ${response.status}`);
  }
  return (await response.json()) as unknown;
}

export async function getCompetitionRoundDatesForEdit(input: {
  competitionId: string;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getCompetitionForSchedule(data.competitionId);
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    const roundsFromResults = await db
      .select({
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        roundName: roundType.name,
        roundRank: sql<number>`COALESCE(${roundType.rank}, 0)`,
      })
      .from(result)
      .leftJoin(roundType, eq(result.roundTypeId, roundType.id))
      .where(eq(result.competitionId, data.competitionId))
      .groupBy(
        result.eventId,
        result.roundTypeId,
        roundType.name,
        roundType.rank,
      )
      .orderBy(asc(result.eventId), asc(sql`COALESCE(${roundType.rank}, 0)`));

    const stored = await db
      .select({
        eventId: competitionRoundDate.eventId,
        roundTypeId: competitionRoundDate.roundTypeId,
        endDate: competitionRoundDate.endDate,
        source: competitionRoundDate.source,
      })
      .from(competitionRoundDate)
      .where(eq(competitionRoundDate.competitionId, data.competitionId));

    const storedByKey = new Map(
      stored.map((r) => [`${r.eventId}:${r.roundTypeId}`, r]),
    );

    const rounds = roundsFromResults
      .filter((r) => r.roundTypeId != null)
      .map((r) => {
        const key = `${r.eventId}:${r.roundTypeId}`;
        const match = storedByKey.get(key);
        return {
          eventId: r.eventId,
          roundTypeId: r.roundTypeId!,
          roundName: r.roundName ?? r.roundTypeId!,
          endDate: match?.endDate ?? null,
          source: match?.source ?? null,
        };
      });

    const source =
      stored.find((r) => r.source === "manual")?.source ??
      stored[0]?.source ??
      null;

    return {
      data: {
        competitionId: data.competitionId,
        competitionName: row.name,
        hasSchedule: stored.length > 0,
        source,
        rounds,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function lookupCompetitionForSchedule(input: {
  competitionId: string;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getCompetitionForSchedule(data.competitionId);
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    const [scheduleRow] = await db
      .select({ source: competitionRoundDate.source })
      .from(competitionRoundDate)
      .where(eq(competitionRoundDate.competitionId, data.competitionId))
      .limit(1);

    return {
      data: {
        id: row.id,
        name: row.name,
        countryId: row.countryId,
        hasResults: true,
        hasSchedule: Boolean(scheduleRow),
        scheduleSource: (scheduleRow?.source ?? null) as
          | "wcif"
          | "manual"
          | null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function importCompetitionScheduleFromWcif(input: {
  competitionId: string;
  /** When true, replace existing schedule (including manual). Default: only fill empty. */
  overwrite?: boolean;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema
      .extend({ overwrite: z.boolean().optional() })
      .parse(input);

    const { error, row } = await getCompetitionForSchedule(data.competitionId);
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    const existing = await db
      .select({ source: competitionRoundDate.source })
      .from(competitionRoundDate)
      .where(eq(competitionRoundDate.competitionId, data.competitionId))
      .limit(1);

    if (existing.length > 0 && !data.overwrite) {
      return {
        data: { skipped: true as const, count: 0 },
        error: null,
      };
    }

    const wcif = await fetchPublicWcif(data.competitionId);
    if (!wcif) {
      return {
        data: null,
        error: "No hay WCIF público disponible para esta competencia",
      };
    }

    const rows = extractRoundEndDatesFromWcif(
      wcif as Parameters<typeof extractRoundEndDatesFromWcif>[0],
    );
    if (rows.length === 0) {
      return {
        data: null,
        error: "El WCIF no tiene fechas de ronda extraíbles",
      };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(competitionRoundDate)
        .where(eq(competitionRoundDate.competitionId, data.competitionId));

      await tx.insert(competitionRoundDate).values(
        rows.map((r) => ({
          competitionId: data.competitionId,
          eventId: r.eventId,
          roundTypeId: r.roundTypeId,
          endDate: r.endDate,
          source: "wcif" as const,
          updatedAt: new Date(),
        })),
      );
    });

    invalidateCompetitionScheduleTags(data.competitionId);

    return {
      data: { skipped: false as const, count: rows.length },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

const saveManualScheduleSchema = z.object({
  competitionId: z.string().min(1),
  rounds: z
    .array(
      z.object({
        eventId: z.string().min(1),
        roundTypeId: z.string().min(1).max(1),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1),
});

export async function saveCompetitionScheduleManual(input: {
  competitionId: string;
  rounds: { eventId: string; roundTypeId: string; endDate: string }[];
}) {
  try {
    await requireSuperadmin();
    const data = saveManualScheduleSchema.parse(input);

    const { error, row } = await getCompetitionForSchedule(data.competitionId);
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(competitionRoundDate)
        .where(eq(competitionRoundDate.competitionId, data.competitionId));

      await tx.insert(competitionRoundDate).values(
        data.rounds.map((r) => ({
          competitionId: data.competitionId,
          eventId: r.eventId,
          roundTypeId: r.roundTypeId,
          endDate: r.endDate,
          source: "manual" as const,
          updatedAt: new Date(),
        })),
      );
    });

    invalidateCompetitionScheduleTags(data.competitionId);

    return { data: { count: data.rounds.length }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function clearCompetitionSchedule(input: {
  competitionId: string;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getCompetitionForSchedule(data.competitionId);
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db
      .delete(competitionRoundDate)
      .where(eq(competitionRoundDate.competitionId, data.competitionId));

    invalidateCompetitionScheduleTags(data.competitionId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

const importMissingSchedulesSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

export async function importMissingCompetitionSchedules(input?: {
  limit?: number;
}) {
  try {
    await requireSuperadmin();
    const data = importMissingSchedulesSchema.parse(input ?? {});
    const limit = data.limit ?? 15;

    const candidates = await db
      .select({ id: competition.id })
      .from(competition)
      .where(
        and(
          sql`EXISTS (SELECT 1 FROM results r WHERE r.competition_id = ${competition.id})`,
          sql`NOT EXISTS (
            SELECT 1 FROM competition_round_dates d
            WHERE d.competition_id = ${competition.id}
          )`,
        ),
      )
      .orderBy(desc(competition.startDate))
      .limit(limit);

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { competitionId: string; error: string }[] = [];

    for (const row of candidates) {
      try {
        const wcif = await fetchPublicWcif(row.id);
        if (!wcif) {
          skipped += 1;
          continue;
        }
        const roundRows = extractRoundEndDatesFromWcif(
          wcif as Parameters<typeof extractRoundEndDatesFromWcif>[0],
        );
        if (roundRows.length === 0) {
          skipped += 1;
          continue;
        }

        await db.insert(competitionRoundDate).values(
          roundRows.map((r) => ({
            competitionId: row.id,
            eventId: r.eventId,
            roundTypeId: r.roundTypeId,
            endDate: r.endDate,
            source: "wcif" as const,
            updatedAt: new Date(),
          })),
        );
        invalidateCompetitionScheduleTags(row.id);
        imported += 1;
      } catch (err) {
        failed += 1;
        errors.push({
          competitionId: row.id,
          error: getErrorMessage(err),
        });
      }
    }

    return {
      data: {
        imported,
        skipped,
        failed,
        attempted: candidates.length,
        errors,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}
