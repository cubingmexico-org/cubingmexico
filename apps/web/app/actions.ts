"use server";

import {
  addMember,
  deleteTeamCover,
  deleteTeamLogo,
  getCurrentUserTeam,
  saveProfile,
  saveTeam,
  updateTeamCover,
  updateTeamLogo,
} from "@/db/queries";
import { getErrorMessage } from "@/lib/handle-error";
import {
  invalidateAfterStateRanksChange,
  invalidateAfterStateRecordsChange,
  invalidateStateMemberTags,
} from "@/lib/cache-tags";
import { getSessionUserId, requireTeamPermission } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  clearPersonStateRanks,
  updateStateRanks,
} from "@/lib/update-state-ranks";
import {
  clearPersonStateRecords,
  updateStateRecords,
} from "@/lib/update-state-records";
import {
  addMemberFormSchema,
  profileFormSchema,
  teamFormSchema,
} from "@/lib/validations";
import { db } from "@workspace/db";
import { person } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { unauthorized } from "next/navigation";
import { z } from "zod";

export async function getCurrentUserTeamAction(userId: string) {
  return getCurrentUserTeam({ userId });
}

export async function isSuperadminAction(wcaId: string) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId || sessionUserId !== wcaId) {
    return false;
  }
  return isSuperadmin(wcaId);
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

    const existing = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    const previousStateId = existing[0]?.stateId ?? null;

    await saveProfile({
      stateId: data.stateId,
      personId: data.personId,
    });

    updateTag(`profile-person-${data.personId}`);
    updateTag(`person-page-${data.personId}`);

    await clearPersonStateRanks([data.personId]);
    await clearPersonStateRecords([data.personId]);

    if (previousStateId && previousStateId !== data.stateId) {
      await updateStateRanks(previousStateId);
      invalidateAfterStateRanksChange(previousStateId);
      const previousRecords = await updateStateRecords(previousStateId);
      invalidateAfterStateRecordsChange(previousRecords.personIds);
    }

    await updateStateRanks(data.stateId);
    invalidateAfterStateRanksChange(data.stateId);
    const newRecords = await updateStateRecords(data.stateId);
    invalidateAfterStateRecordsChange([data.personId, ...newRecords.personIds]);

    return {
      defaultValues: {
        stateId: data.stateId,
        personId: data.personId,
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

    await addMember({
      stateId: data.stateId,
      personId: data.personId,
      specialties,
      achievements: null,
    });

    await updateStateRanks(data.stateId);
    invalidateAfterStateRanksChange(data.stateId);
    const records = await updateStateRecords(data.stateId);
    invalidateAfterStateRecordsChange(records.personIds);
    invalidateStateMemberTags(data.stateId);
    updateTag("persons-without-state");

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

export async function deleteTeamLogoAction(stateId: string) {
  await requireTeamPermission(stateId, "team.media");

  try {
    await deleteTeamLogo({
      stateId,
    });

    updateTag(`team-info-${stateId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete team logo in database");
    throw error;
  }
}

export async function deleteTeamCoverAction(stateId: string) {
  await requireTeamPermission(stateId, "team.media");

  try {
    await deleteTeamCover({
      stateId,
    });

    updateTag(`team-info-${stateId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to delete team cover in database");
    throw error;
  }
}

export async function updateTeamLogoAction(
  stateId: string,
  image: string | null,
) {
  await requireTeamPermission(stateId, "team.media");

  try {
    await updateTeamLogo({
      stateId,
      image,
    });

    updateTag(`team-info-${stateId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update team logo in database");
    throw error;
  }
}

export async function updateTeamCoverAction(
  stateId: string,
  coverImage: string | null,
) {
  await requireTeamPermission(stateId, "team.media");

  try {
    await updateTeamCover({
      stateId,
      coverImage,
    });

    updateTag(`team-info-${stateId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to update team cover in database");
    throw error;
  }
}
