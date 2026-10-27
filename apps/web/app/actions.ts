"use server";

import { getCurrentUserTeam } from "@/db/queries";
import {
  addMember,
  saveProfile,
  saveProfileSpecialties,
  saveTeam,
  updateTeamCover,
  updateTeamLogo,
} from "@/db/mutations";
import { deleteUploadedFileIfUnused } from "@/lib/uploadthing-files";
import { uploadThingFileKey } from "@/lib/uploadthing-key";
import { getErrorMessage } from "@/lib/handle-error";
import { invalidateStateMemberTags } from "@/lib/cache-tags";
import { getSessionUserId, requireTeamPermission } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  refreshStatesAfterRosterChange,
  ROSTER_REFRESH_PENDING,
} from "@/lib/roster-refresh";
import {
  addMemberFormSchema,
  preferencesFormSchema,
  profileFormSchema,
  teamFormSchema,
} from "@/lib/validations";
import { db } from "@workspace/db";
import { person } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { unauthorized } from "next/navigation";
import { z } from "zod";

export type HeaderContext = {
  team: { id: string; name: string } | null;
  isSuperadmin: boolean;
};

/** The signed-in person's team and superadmin flag, read from the session. */
export async function getHeaderContextAction(): Promise<HeaderContext | null> {
  const wcaId = await getSessionUserId();
  if (!wcaId) {
    return null;
  }
  const team = await getCurrentUserTeam({ userId: wcaId });
  return { team: team ?? null, isSuperadmin: isSuperadmin(wcaId) };
}

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

export async function teamFormAction(_prevState: unknown, formData: FormData) {
  const formDataEntries = Object.fromEntries(formData.entries());
  if (formDataEntries.whatsapp) {
    formDataEntries.whatsapp = (formDataEntries.whatsapp as string).replace(
      /\s+/g,
      "",
    );
  }

  const defaultValues = z.record(z.string(), z.string()).parse(formDataEntries);

  try {
    const data = teamFormSchema.parse(Object.fromEntries(formData));

    await requireTeamPermission(data.stateId, "team.settings");

    await saveTeam({
      stateId: data.stateId,
      name: data.name,
      description: data.description,
      socialLinks: {
        email: data.email,
        whatsapp: data.whatsapp,
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        tiktok: data.tiktok,
      },
      founded: new Date(data.founded || Date.now()),
      isActive: data.isActive === "on",
    });

    updateTag(`team-info-${data.stateId}`);

    return {
      defaultValues: {
        name: data.name,
        description: data.description,
        email: data.email,
        whatsapp: data.whatsapp,
        facebook: data.facebook,
        instagram: data.instagram,
        twitter: data.twitter,
        tiktok: data.tiktok,
        founded: data.founded,
        isActive: data.isActive,
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

export async function addMemberFormAction(
  _prevState: unknown,
  formData: FormData,
) {
  const defaultValues = z
    .record(z.string(), z.string())
    .parse(Object.fromEntries(formData.entries()));

  try {
    const data = addMemberFormSchema.parse(Object.fromEntries(formData));

    await requireTeamPermission(data.stateId, "team.members");

    const specialties = data.specialties
      ? data.specialties.split(",").map((speciality) => speciality.trim())
      : null;

    const [candidate] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    // Moving someone out of another team goes through a superadmin (assignPersonState).
    if (
      !candidate ||
      (candidate.stateId && candidate.stateId !== data.stateId)
    ) {
      return {
        defaultValues,
        success: false,
        errors: candidate
          ? "Esta persona ya pertenece a otro team."
          : "Persona no encontrada.",
        warning: null,
      };
    }

    await addMember({
      stateId: data.stateId,
      personId: data.personId,
      specialties,
      achievements: null,
    });

    const { ok } = await refreshStatesAfterRosterChange({
      stateIds: [data.stateId],
      personIds: [data.personId],
    });

    return {
      defaultValues: {
        stateId: data.stateId,
        personId: data.personId,
        specialties,
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

export async function deleteTeamLogoAction(stateId: string) {
  return updateTeamLogoAction(stateId, null);
}

export async function deleteTeamCoverAction(stateId: string) {
  return updateTeamCoverAction(stateId, null);
}

const teamImageSchema = z
  .string()
  .refine((url) => uploadThingFileKey(url) !== null, "Imagen no válida")
  .nullable();

export async function updateTeamLogoAction(
  stateId: string,
  image: string | null,
) {
  await requireTeamPermission(stateId, "team.media");

  const previous = await updateTeamLogo({
    stateId,
    image: teamImageSchema.parse(image),
  });
  updateTag(`team-info-${stateId}`);
  if (previous !== image) {
    await deleteUploadedFileIfUnused(previous);
  }

  return {
    success: true,
  };
}

export async function updateTeamCoverAction(
  stateId: string,
  coverImage: string | null,
) {
  await requireTeamPermission(stateId, "team.media");

  const previous = await updateTeamCover({
    stateId,
    coverImage: teamImageSchema.parse(coverImage),
  });
  updateTag(`team-info-${stateId}`);
  if (previous !== coverImage) {
    await deleteUploadedFileIfUnused(previous);
  }

  return {
    success: true,
  };
}
