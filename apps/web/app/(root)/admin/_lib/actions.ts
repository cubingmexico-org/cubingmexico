"use server";

import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  person,
  result,
  roundType,
  state,
  teamMember,
} from "@workspace/db/schema";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getErrorMessage } from "@/lib/handle-error";
import {
  invalidateAfterStateRanksChange,
  invalidateAfterStateRecordsChange,
  invalidateStateMemberTags,
} from "@/lib/cache-tags";
import { requireSuperadmin } from "@/lib/superadmin";
import {
  clearPersonStateRanks,
  updateStateRanks,
} from "@/lib/update-state-ranks";
import {
  clearPersonStateRecords,
  updateStateRecords,
} from "@/lib/update-state-records";
import { extractRoundEndDatesFromWcif } from "@/lib/competition-round-dates";
const assignPersonStateSchema = z.object({
  personId: z.string().min(1),
  stateId: z.string().min(1).nullable(),
  role: z.enum(["admin", "editor"]).nullable().optional(),
});

const updateMemberRoleSchema = z.object({
  personId: z.string().min(1),
  stateId: z.string().min(1),
  role: z.enum(["admin", "editor"]).nullable(),
});

const updatePersonHideFromRosterSchema = z.object({
  personId: z.string().min(1),
  hideFromRoster: z.boolean(),
});

const updateCompetitionStateSchema = z.object({
  competitionId: z.string().min(1),
  stateId: z.string().min(1).nullable(),
});

const applyPersonStateGuessesSchema = z.object({
  assignments: z
    .array(
      z.object({
        personId: z.string().min(1),
        stateId: z.string().min(1),
      }),
    )
    .min(1)
    .max(100),
});

async function recomputeStateSideEffects(
  personId: string,
  previousStateId: string | null,
  nextStateId: string | null,
) {
  await clearPersonStateRanks([personId]);
  await clearPersonStateRecords([personId]);

  if (previousStateId && previousStateId !== nextStateId) {
    await updateStateRanks(previousStateId);
    invalidateAfterStateRanksChange(previousStateId);
    const previousRecords = await updateStateRecords(previousStateId);
    invalidateAfterStateRecordsChange(previousRecords.personIds);
    invalidateStateMemberTags(previousStateId);
  }

  if (nextStateId) {
    await updateStateRanks(nextStateId);
    invalidateAfterStateRanksChange(nextStateId);
    const newRecords = await updateStateRecords(nextStateId);
    invalidateAfterStateRecordsChange([personId, ...newRecords.personIds]);
    invalidateStateMemberTags(nextStateId);
  }

  updateTag(`profile-person-${personId}`);
  updateTag(`person-page-${personId}`);
  updateTag("persons-without-state");
}

function invalidateAfterBulkStateAssign(
  personIds: string[],
  stateIds: string[],
) {
  for (const stateId of stateIds) {
    invalidateAfterStateRanksChange(stateId);
    invalidateStateMemberTags(stateId);
  }

  for (const personId of personIds) {
    updateTag(`profile-person-${personId}`);
    updateTag(`person-page-${personId}`);
  }

  updateTag("persons-without-state");
}

export async function assignPersonState(input: {
  personId: string;
  stateId: string | null;
  role?: "admin" | "editor" | null;
}) {
  try {
    await requireSuperadmin();
    const data = assignPersonStateSchema.parse(input);

    const existing = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (existing.length === 0) {
      return { data: null, error: "Persona no encontrada" };
    }

    const previousStateId = existing[0]?.stateId ?? null;

    await db
      .update(person)
      .set({ stateId: data.stateId })
      .where(eq(person.wcaId, data.personId));

    if (data.stateId && data.role !== undefined) {
      await db
        .insert(teamMember)
        .values({
          personId: data.personId,
          role: data.role,
        })
        .onConflictDoUpdate({
          target: [teamMember.personId],
          set: { role: data.role },
        });
    }

    await recomputeStateSideEffects(
      data.personId,
      previousStateId,
      data.stateId,
    );

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function applyPersonStateGuesses(input: {
  assignments: { personId: string; stateId: string }[];
}) {
  try {
    await requireSuperadmin();
    const data = applyPersonStateGuessesSchema.parse(input);

    const byPerson = new Map<string, string>();
    for (const assignment of data.assignments) {
      byPerson.set(assignment.personId, assignment.stateId);
    }

    const personIds = [...byPerson.keys()];
    const requestedStateIds = [...new Set(byPerson.values())];

    const validStates = await db
      .select({ id: state.id })
      .from(state)
      .where(inArray(state.id, requestedStateIds));
    const validStateIds = new Set(validStates.map((row) => row.id));

    for (const stateId of requestedStateIds) {
      if (!validStateIds.has(stateId)) {
        return { data: null, error: `Estado inválido: ${stateId}` };
      }
    }

    const eligible = await db
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(and(inArray(person.wcaId, personIds), isNull(person.stateId)));

    const eligibleIds = eligible.map((row) => row.wcaId);
    if (eligibleIds.length === 0) {
      return {
        data: {
          applied: 0,
          skipped: personIds.length,
          stateIds: [] as string[],
        },
        error: null,
      };
    }

    const appliedByState = new Map<string, string[]>();
    for (const personId of eligibleIds) {
      const stateId = byPerson.get(personId);
      if (!stateId) continue;
      const list = appliedByState.get(stateId) ?? [];
      list.push(personId);
      appliedByState.set(stateId, list);
    }

    for (const [stateId, ids] of appliedByState) {
      await db
        .update(person)
        .set({ stateId })
        .where(and(inArray(person.wcaId, ids), isNull(person.stateId)));
    }

    const appliedPersonIds = [...appliedByState.values()].flat();
    const affectedStateIds = [...appliedByState.keys()];

    await clearPersonStateRanks(appliedPersonIds);
    await clearPersonStateRecords(appliedPersonIds);

    const recordPersonIds = new Set<string>(appliedPersonIds);
    for (const stateId of affectedStateIds) {
      await updateStateRanks(stateId);
      const records = await updateStateRecords(stateId);
      for (const id of records.personIds) {
        recordPersonIds.add(id);
      }
    }

    invalidateAfterBulkStateAssign(appliedPersonIds, affectedStateIds);
    invalidateAfterStateRecordsChange([...recordPersonIds]);

    return {
      data: {
        applied: appliedPersonIds.length,
        skipped: personIds.length - appliedPersonIds.length,
        stateIds: affectedStateIds,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function updateAdminMemberRole(input: {
  personId: string;
  stateId: string;
  role: "admin" | "editor" | null;
}) {
  try {
    await requireSuperadmin();
    const data = updateMemberRoleSchema.parse(input);

    const member = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (member[0]?.stateId !== data.stateId) {
      return {
        data: null,
        error: "El miembro no pertenece a este team",
      };
    }

    await db
      .insert(teamMember)
      .values({
        personId: data.personId,
        role: data.role,
      })
      .onConflictDoUpdate({
        target: [teamMember.personId],
        set: { role: data.role },
      });

    invalidateStateMemberTags(data.stateId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function updatePersonHideFromRoster(input: {
  personId: string;
  hideFromRoster: boolean;
}) {
  try {
    await requireSuperadmin();
    const data = updatePersonHideFromRosterSchema.parse(input);

    const existing = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (existing.length === 0) {
      return { data: null, error: "Persona no encontrada" };
    }

    await db
      .update(person)
      .set({ hideFromRoster: data.hideFromRoster })
      .where(eq(person.wcaId, data.personId));

    const stateId = existing[0]?.stateId;
    if (stateId) {
      invalidateStateMemberTags(stateId);
    }
    updateTag("teams-data");

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function updateCompetitionState(input: {
  competitionId: string;
  stateId: string | null;
}) {
  try {
    await requireSuperadmin();
    const data = updateCompetitionStateSchema.parse(input);

    const existing = await db
      .select({
        id: competition.id,
        countryId: competition.countryId,
        stateId: competition.stateId,
      })
      .from(competition)
      .where(eq(competition.id, data.competitionId))
      .limit(1);

    if (existing.length === 0) {
      return { data: null, error: "Competencia no encontrada" };
    }

    if (existing[0]?.countryId !== "Mexico") {
      return {
        data: null,
        error: "Solo se pueden editar competencias de México",
      };
    }

    const previousStateId = existing[0]?.stateId ?? null;

    await db
      .update(competition)
      .set({ stateId: data.stateId })
      .where(eq(competition.id, data.competitionId));

    updateTag("competitions");
    updateTag("competitions-state-counts");
    updateTag("competitions-locations");
    updateTag(`wca-competition-data-${data.competitionId}`);

    if (previousStateId) {
      updateTag(`team-competitions-${previousStateId}`);
    }
    if (data.stateId) {
      updateTag(`team-competitions-${data.stateId}`);
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

const updateCompetitionLogoSchema = z.object({
  competitionId: z.string().min(1),
  logo: z.string().url(),
});

const competitionIdSchema = z.object({
  competitionId: z.string().min(1),
});

const importMissingLogosSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

function invalidateCompetitionLogoTags(
  competitionId: string,
  stateId?: string | null,
) {
  updateTag("competitions");
  updateTag(`competition-logo-${competitionId}`);
  if (stateId) {
    updateTag(`team-competitions-${stateId}`);
  }
}

async function getMexicanCompetitionForLogo(competitionId: string) {
  const existing = await db
    .select({
      id: competition.id,
      countryId: competition.countryId,
      information: competition.information,
      logo: competition.logo,
      stateId: competition.stateId,
    })
    .from(competition)
    .where(eq(competition.id, competitionId))
    .limit(1);

  if (existing.length === 0) {
    return { error: "Competencia no encontrada" as const, row: null };
  }

  if (existing[0]?.countryId !== "Mexico") {
    return {
      error: "Solo se pueden editar competencias de México" as const,
      row: null,
    };
  }

  return { error: null, row: existing[0]! };
}

export async function updateCompetitionLogo(input: {
  competitionId: string;
  logo: string;
}) {
  try {
    await requireSuperadmin();
    const data = updateCompetitionLogoSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db
      .update(competition)
      .set({ logo: data.logo })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: { logo: data.logo }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function clearCompetitionLogo(input: { competitionId: string }) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    await db
      .update(competition)
      .set({ logo: null })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * Fetch a remote logo (e.g. WCA Active Storage) server-side for client
 * background removal, avoiding browser CORS limits.
 */
export async function fetchCompetitionLogoForEdit(input: {
  competitionId: string;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema.parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    if (!row.logo) {
      return { data: null, error: "La competencia no tiene logo" };
    }

    if (row.logo.startsWith("data:")) {
      return { data: { dataUrl: row.logo }, error: null };
    }

    const response = await fetch(row.logo);
    if (!response.ok) {
      return {
        data: null,
        error: `No se pudo descargar el logo (${response.status})`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;

    return { data: { dataUrl }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function importCompetitionLogoFromInformation(input: {
  competitionId: string;
  /** When true, overwrite an existing logo. Default: only fill empty logos. */
  overwrite?: boolean;
}) {
  try {
    await requireSuperadmin();
    const data = competitionIdSchema
      .extend({ overwrite: z.boolean().optional() })
      .parse(input);

    const { error, row } = await getMexicanCompetitionForLogo(
      data.competitionId,
    );
    if (error || !row) {
      return { data: null, error: error ?? "Competencia no encontrada" };
    }

    if (row.logo && !data.overwrite) {
      return {
        data: { logo: row.logo, skipped: true as const },
        error: null,
      };
    }

    const { extractFirstImageUrl } = await import("@/lib/competition-logo");
    const sourceUrl = extractFirstImageUrl(row.information);
    if (!sourceUrl) {
      return {
        data: null,
        error: "No hay imagen en la información de la competencia",
      };
    }

    await db
      .update(competition)
      .set({ logo: sourceUrl })
      .where(eq(competition.id, data.competitionId));

    invalidateCompetitionLogoTags(data.competitionId, row.stateId);

    return { data: { logo: sourceUrl, skipped: false as const }, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function importMissingCompetitionLogos(input?: {
  limit?: number;
}) {
  try {
    await requireSuperadmin();
    const data = importMissingLogosSchema.parse(input ?? {});
    const limit = data.limit ?? 25;

    const { extractFirstImageUrl } = await import("@/lib/competition-logo");

    const candidates = await db
      .select({
        id: competition.id,
        information: competition.information,
        stateId: competition.stateId,
      })
      .from(competition)
      .where(and(eq(competition.countryId, "Mexico"), isNull(competition.logo)))
      .orderBy(desc(competition.startDate))
      .limit(limit * 3);

    const withImages = candidates
      .map((row) => ({
        id: row.id,
        stateId: row.stateId,
        sourceUrl: extractFirstImageUrl(row.information),
      }))
      .filter(
        (
          row,
        ): row is {
          id: string;
          stateId: string | null;
          sourceUrl: string;
        } => row.sourceUrl !== null,
      )
      .slice(0, limit);

    let imported = 0;
    let failed = 0;
    const errors: { competitionId: string; error: string }[] = [];

    for (const row of withImages) {
      try {
        await db
          .update(competition)
          .set({ logo: row.sourceUrl })
          .where(eq(competition.id, row.id));
        invalidateCompetitionLogoTags(row.id, row.stateId);
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
        failed,
        attempted: withImages.length,
        errors,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

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
    `https://www.worldcubeassociation.org/api/v0/competitions/${competitionId}/wcif/public`,
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
