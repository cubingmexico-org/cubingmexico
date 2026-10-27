"use server";

import { saveProfile, saveProfileSpecialties } from "@/db/mutations";
import { getErrorMessage } from "@/lib/handle-error";
import { invalidateStateMemberTags } from "@/lib/cache-tags";
import { getSessionUserId } from "@/lib/team-auth";
import {
  refreshStatesAfterRosterChange,
  ROSTER_REFRESH_PENDING,
} from "@/lib/roster-refresh";
import { preferencesFormSchema, profileFormSchema } from "@/lib/validations";
import { db } from "@workspace/db";
import { person } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { unauthorized } from "next/navigation";
import { z } from "zod";

export async function profileFormAction(
  _prevState: unknown,
  formData: FormData,
) {
  const formDataEntries = Object.fromEntries(formData.entries());

  const defaultValues = z.record(z.string(), z.string()).parse(formDataEntries);

  try {
    const data = profileFormSchema.parse(Object.fromEntries(formData));
    const userId = await getSessionUserId();

    if (!userId || userId !== data.personId) {
      unauthorized();
    }

    const [existing] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (!existing) {
      return {
        defaultValues,
        success: false,
        errors: "No encontramos tu perfil de la WCA.",
        warning: null,
      };
    }

    // Changing an existing state goes through a superadmin (assignPersonState).
    if (existing.stateId) {
      return {
        defaultValues: {
          stateId: existing.stateId,
          personId: data.personId,
        },
        success: false,
        errors:
          "Ya tienes un estado asignado. Contacta a un administrador para cambiarlo.",
        warning: null,
      };
    }

    await saveProfile({
      stateId: data.stateId,
      personId: data.personId,
    });

    const { ok } = await refreshStatesAfterRosterChange({
      stateIds: [data.stateId],
      personIds: [data.personId],
    });

    return {
      defaultValues: {
        stateId: data.stateId,
        personId: data.personId,
      },
      success: true,
      errors: null,
      warning: ok ? null : ROSTER_REFRESH_PENDING,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        defaultValues,
        success: false,
        errors: getErrorMessage(error),
        warning: null,
      };
    }

    throw error;
  }
}

export async function preferencesFormAction(
  _prevState: unknown,
  formData: FormData,
) {
  const formDataEntries = Object.fromEntries(formData.entries());

  const defaultValues = z.record(z.string(), z.string()).parse(formDataEntries);

  try {
    const data = preferencesFormSchema.parse(Object.fromEntries(formData));
    const userId = await getSessionUserId();

    if (!userId || userId !== data.personId) {
      unauthorized();
    }

    const existing = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    const stateId = existing[0]?.stateId ?? null;

    if (!stateId) {
      return {
        defaultValues: {
          personId: data.personId,
          specialties: data.specialties ?? "",
        },
        success: false,
        errors:
          "Debes seleccionar un estado en General antes de guardar especialidades.",
      };
    }

    const specialties = data.specialties
      ? data.specialties.split(",").map((speciality) => speciality.trim())
      : [];

    await saveProfileSpecialties({
      personId: data.personId,
      specialties,
    });

    updateTag(`profile-person-${data.personId}`);
    invalidateStateMemberTags(stateId);

    return {
      defaultValues: {
        personId: data.personId,
        specialties: specialties.join(","),
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
