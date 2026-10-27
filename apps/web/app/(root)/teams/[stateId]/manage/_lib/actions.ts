"use server";

import { db } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getErrorMessage } from "@/lib/handle-error";
import { invalidateStateMemberTags } from "@/lib/cache-tags";
import { requireTeamPermission } from "@/lib/team-auth";
import {
  refreshStatesAfterRosterChange,
  ROSTER_REFRESH_PENDING,
} from "@/lib/roster-refresh";
import { person, teamMember } from "@workspace/db/schema";

import { addMemberFormSchema } from "@/lib/validations";
import { z } from "zod";

export async function updateMember(_prevState: unknown, formData: FormData) {
  const defaultValues = z
    .record(z.string(), z.string())
    .parse(Object.fromEntries(formData.entries()));

  try {
    const data = addMemberFormSchema.parse(Object.fromEntries(formData));

    await requireTeamPermission(data.stateId, "team.members");

    const specialties = data.specialties
      ? data.specialties.split(",").map((speciality) => speciality.trim())
      : null;

    const [member] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (member?.stateId !== data.stateId) {
      return {
        defaultValues,
        success: false,
        errors: "El miembro no pertenece a este team",
      };
    }

    await db
      .insert(teamMember)
      .values({
        personId: data.personId,
        specialties: specialties,
        achievements: null,
      })
      .onConflictDoUpdate({
        target: [teamMember.personId],
        set: {
          specialties: specialties,
          achievements: null,
        },
      });

    updateTag(`members-list-${data.stateId}`);

    return {
      defaultValues: {
        stateId: data.stateId,
        personId: data.personId,
        specialties,
      },
      success: true,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        defaultValues,
        success: false,
        errors: getErrorMessage(error),
      };
    }

    throw error;
  }
}

export async function deleteMembers(input: { ids: string[]; stateId: string }) {
  try {
    await requireTeamPermission(input.stateId, "team.members");

    const members = await db
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(
        and(
          inArray(person.wcaId, input.ids),
          eq(person.stateId, input.stateId),
        ),
      );
    const ids = members.map((member) => member.wcaId);
    if (ids.length === 0) {
      return { data: null, error: null, warning: null };
    }

    await db.transaction(async (tx) => {
      await tx.delete(teamMember).where(inArray(teamMember.personId, ids));
      await tx
        .update(person)
        .set({ stateId: null })
        .where(inArray(person.wcaId, ids));
    });

    const { ok } = await refreshStatesAfterRosterChange({
      stateIds: [input.stateId],
      personIds: ids,
    });

    return {
      data: null,
      error: null,
      warning: ok ? null : ROSTER_REFRESH_PENDING,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
      warning: null,
    };
  }
}

export async function updateMemberRole(input: {
  personId: string;
  stateId: string;
  role: "admin" | "editor" | null;
}) {
  try {
    await requireTeamPermission(input.stateId, "team.roles");

    const member = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, input.personId))
      .limit(1);

    if (member[0]?.stateId !== input.stateId) {
      return {
        data: null,
        error: "El miembro no pertenece a este team",
      };
    }

    await db
      .insert(teamMember)
      .values({
        personId: input.personId,
        role: input.role,
      })
      .onConflictDoUpdate({
        target: [teamMember.personId],
        set: {
          role: input.role,
        },
      });

    invalidateStateMemberTags(input.stateId);

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    };
  }
}
