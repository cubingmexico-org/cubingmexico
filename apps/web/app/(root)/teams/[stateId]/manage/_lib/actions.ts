"use server";

import { db } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getErrorMessage } from "@/lib/handle-error";
import { person, teamMember } from "@workspace/db/schema";

import { addMemberFormSchema } from "@/lib/validations";
import { z } from "zod";

export async function updateMember(_prevState: unknown, formData: FormData) {
  const defaultValues = z
    .record(z.string(), z.string())
    .parse(Object.fromEntries(formData.entries()));

  try {
    const data = addMemberFormSchema.parse(Object.fromEntries(formData));

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

    updateTag("members");

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

    return {
      defaultValues,
      success: false,
      errors: null,
    };
  }
}

export async function deleteMember(input: { id: string }) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(teamMember).where(eq(teamMember.personId, input.id));
      await tx
        .update(person)
        .set({ stateId: null })
        .where(eq(person.wcaId, input.id));
    });

    updateTag("members");
    updateTag("members-gender-count");

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
    await db.transaction(async (tx) => {
      await tx
        .delete(teamMember)
        .where(inArray(teamMember.personId, input.ids));
      await tx
        .update(person)
        .set({ stateId: null })
        .where(inArray(person.wcaId, input.ids));
    });

    updateTag("members");
    updateTag("members-gender-count");

    await fetch(process.env.URL + "/api/update-state-ranks", {
      method: "POST",
      body: JSON.stringify({ stateId: input.stateId }),
    });

    updateTag("state-kinch-ranks");
    updateTag("combined-records");
    updateTag("ranks-single");
    updateTag("ranks-average");

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
