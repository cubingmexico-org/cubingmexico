"use server";

import { db } from "@workspace/db";
import { competition, person, state, teamMember } from "@workspace/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getErrorMessage } from "@/lib/handle-error";
import { invalidateStateMemberTags } from "@/lib/cache-tags";
import { requireSuperadmin } from "@/lib/superadmin";
import {
  refreshStatesAfterRosterChange,
  ROSTER_REFRESH_PENDING,
} from "@/lib/roster-refresh";

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
      return { data: null, error: "Persona no encontrada", warning: null };
    }

    const previousStateId = existing[0]?.stateId ?? null;

    await db.transaction(async (tx) => {
      await tx
        .update(person)
        .set({ stateId: data.stateId })
        .where(eq(person.wcaId, data.personId));

      if (data.stateId && data.role !== undefined) {
        await tx
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
    });

    const { ok } = await refreshStatesAfterRosterChange({
      stateIds: [previousStateId, data.stateId],
      personIds: [data.personId],
    });

    return {
      data: null,
      error: null,
      warning: ok ? null : ROSTER_REFRESH_PENDING,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err), warning: null };
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
        return {
          data: null,
          error: `Estado inválido: ${stateId}`,
          warning: null,
        };
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
        warning: null,
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

    const { ok } = await refreshStatesAfterRosterChange({
      stateIds: affectedStateIds,
      personIds: appliedPersonIds,
    });

    return {
      data: {
        applied: appliedPersonIds.length,
        skipped: personIds.length - appliedPersonIds.length,
        stateIds: affectedStateIds,
      },
      error: null,
      warning: ok ? null : ROSTER_REFRESH_PENDING,
    };
  } catch (err) {
    return { data: null, error: getErrorMessage(err), warning: null };
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
