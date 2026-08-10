"use server";

import { db } from "@workspace/db";
import { competition, person, teamMember } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

const updateCompetitionStateSchema = z.object({
  competitionId: z.string().min(1),
  stateId: z.string().min(1).nullable(),
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
