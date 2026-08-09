"use server";

import { db } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getErrorMessage } from "@/lib/handle-error";
import {
  invalidateAfterStateRanksChange,
  invalidateStateMemberTags,
} from "@/lib/cache-tags";
import { requireTeamPermission } from "@/lib/team-auth";
import {
  clearPersonStateRanks,
  updateStateRanks,
} from "@/lib/update-state-ranks";
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

export async function deleteMember(input: { id: string; stateId: string }) {
  try {
    await requireTeamPermission(input.stateId, "team.members");

    await db.transaction(async (tx) => {
      await tx.delete(teamMember).where(eq(teamMember.personId, input.id));
      await tx
        .update(person)
        .set({ stateId: null })
        .where(eq(person.wcaId, input.id));
    });

    await clearPersonStateRanks([input.id]);
    await updateStateRanks(input.stateId);
    invalidateAfterStateRanksChange(input.stateId);
    updateTag("persons-without-state");

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

export async function deleteMembers(input: { ids: string[]; stateId: string }) {
  try {
    await requireTeamPermission(input.stateId, "team.members");

    await db.transaction(async (tx) => {
      await tx
        .delete(teamMember)
        .where(inArray(teamMember.personId, input.ids));
      await tx
        .update(person)
        .set({ stateId: null })
        .where(inArray(person.wcaId, input.ids));
    });

    await clearPersonStateRanks(input.ids);
    await updateStateRanks(input.stateId);
    invalidateAfterStateRanksChange(input.stateId);
    updateTag("persons-without-state");

    return {
      data: null,
      error: null,
    };
  } catch (err) {
    console.error("Error deleting members", err);
    return {
      data: null,
      error: getErrorMessage(err),
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
