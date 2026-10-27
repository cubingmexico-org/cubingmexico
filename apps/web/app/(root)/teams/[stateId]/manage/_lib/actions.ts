"use server";

import { db } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";

import {
  addMember,
  saveTeam,
  updateTeamCover,
  updateTeamLogo,
} from "@/db/mutations";
import { getErrorMessage } from "@/lib/handle-error";
import { invalidateStateMemberTags } from "@/lib/cache-tags";
import { requireTeamPermission } from "@/lib/team-auth";
import {
  refreshStatesAfterRosterChange,
  ROSTER_REFRESH_PENDING,
} from "@/lib/roster-refresh";
import { deleteUploadedFileIfUnused } from "@/lib/uploadthing-files";
import { uploadThingFileKey } from "@/lib/uploadthing-key";
import { person, teamMember } from "@workspace/db/schema";

import { addMemberFormSchema, teamFormSchema } from "@/lib/validations";
import { z } from "zod";

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
