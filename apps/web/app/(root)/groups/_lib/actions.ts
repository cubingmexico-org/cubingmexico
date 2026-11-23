"use server";

import { db } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import {
  addGroupMember,
  createGroup,
  removeGroupMembers,
  saveGroup,
  setSponsorshipStatus,
  updateGroupCover,
  updateGroupLogo,
  updateGroupMemberMeta,
} from "@/db/group-mutations";
import { getErrorMessage } from "@/lib/handle-error";
import { requireGroupPermission } from "@/lib/group-auth";
import {
  GROUP_ROSTER_REFRESH_PENDING,
  refreshGroupsAfterRosterChange,
} from "@/lib/group-roster-refresh";
import { requireSuperadmin } from "@/lib/superadmin";
import { deleteUploadedFileIfUnused } from "@/lib/uploadthing-files";
import { uploadThingFileKey } from "@/lib/uploadthing-key";
import { groupMembership, person } from "@workspace/db/schema";
import {
  addGroupMemberFormSchema,
  createGroupSchema,
  groupFormSchema,
  setSponsorshipSchema,
} from "./validations";

export async function groupFormAction(_prevState: unknown, formData: FormData) {
  const formDataEntries = Object.fromEntries(formData.entries());
  if (formDataEntries.whatsapp) {
    formDataEntries.whatsapp = (formDataEntries.whatsapp as string).replace(
      /\s+/g,
      "",
    );
  }

  const defaultValues = z.record(z.string(), z.string()).parse(formDataEntries);

  try {
    const data = groupFormSchema.parse(Object.fromEntries(formData));
    await requireGroupPermission(data.groupId, "group.settings");

    await saveGroup({
      id: data.groupId,
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
      regionLabel: data.regionLabel ?? null,
      websiteUrl: data.websiteUrl || null,
      publicityBlurb: data.publicityBlurb ?? null,
    });

    updateTag(`group-info-${data.groupId}`);
    updateTag("groups-directory-community");
    updateTag("groups-directory-sponsor");
    updateTag("groups-publicity");

    return {
      defaultValues: {
        name: data.name,
        description: data.description ?? "",
        email: data.email ?? "",
        whatsapp: data.whatsapp ?? "",
        facebook: data.facebook ?? "",
        instagram: data.instagram ?? "",
        twitter: data.twitter ?? "",
        tiktok: data.tiktok ?? "",
        founded: data.founded ?? "",
        isActive: data.isActive ?? "",
        regionLabel: data.regionLabel ?? "",
        websiteUrl: data.websiteUrl ?? "",
        publicityBlurb: data.publicityBlurb ?? "",
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

export async function addGroupMemberFormAction(
  _prevState: unknown,
  formData: FormData,
) {
  const defaultValues = z
    .record(z.string(), z.string())
    .parse(Object.fromEntries(formData.entries()));

  try {
    const data = addGroupMemberFormSchema.parse(Object.fromEntries(formData));
    await requireGroupPermission(data.groupId, "group.members");

    const specialties = data.specialties
      ? data.specialties.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const [candidate] = await db
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(eq(person.wcaId, data.personId))
      .limit(1);

    if (!candidate) {
      return {
        defaultValues,
        success: false,
        errors: "Persona no encontrada.",
        warning: null,
      };
    }

    await addGroupMember({
      groupId: data.groupId,
      personId: data.personId,
      specialties,
      achievements: null,
    });

    const { ok } = await refreshGroupsAfterRosterChange({
      groupIds: [data.groupId],
      personIds: [data.personId],
    });

    return {
      defaultValues: {
        groupId: data.groupId,
        personId: data.personId,
        specialties: specialties?.join(", ") ?? "",
      },
      success: true,
      errors: null,
      warning: ok ? null : GROUP_ROSTER_REFRESH_PENDING,
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

export async function updateGroupMemberAction(
  _prevState: unknown,
  formData: FormData,
) {
  const defaultValues = z
    .record(z.string(), z.string())
    .parse(Object.fromEntries(formData.entries()));

  try {
    const data = addGroupMemberFormSchema.parse(Object.fromEntries(formData));
    await requireGroupPermission(data.groupId, "group.members");

    const specialties = data.specialties
      ? data.specialties.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const [member] = await db
      .select({ personId: groupMembership.personId })
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, data.groupId),
          eq(groupMembership.personId, data.personId),
        ),
      )
      .limit(1);

    if (!member) {
      return {
        defaultValues,
        success: false,
        errors: "El miembro no pertenece a este grupo",
      };
    }

    await updateGroupMemberMeta({
      groupId: data.groupId,
      personId: data.personId,
      specialties,
    });

    updateTag(`group-members-${data.groupId}`);

    return {
      defaultValues: {
        groupId: data.groupId,
        personId: data.personId,
        specialties: specialties?.join(", ") ?? "",
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

export async function deleteGroupMembers(input: {
  ids: string[];
  groupId: string;
}) {
  try {
    await requireGroupPermission(input.groupId, "group.members");

    const members = await db
      .select({ personId: groupMembership.personId })
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, input.groupId),
          inArray(groupMembership.personId, input.ids),
        ),
      );

    const personIds = members.map((m) => m.personId);
    await removeGroupMembers({ groupId: input.groupId, personIds });

    const { ok } = await refreshGroupsAfterRosterChange({
      groupIds: [input.groupId],
      personIds,
    });

    return {
      data: null,
      error: null,
      warning: ok ? null : GROUP_ROSTER_REFRESH_PENDING,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error),
      warning: null,
    };
  }
}

const groupImageSchema = z
  .string()
  .refine((url) => uploadThingFileKey(url) !== null, "Imagen no válida")
  .nullable();

export async function updateGroupLogoAction(
  groupId: string,
  image: string | null,
) {
  await requireGroupPermission(groupId, "group.media");
  const previous = await updateGroupLogo({
    id: groupId,
    image: groupImageSchema.parse(image),
  });
  updateTag(`group-info-${groupId}`);
  updateTag("groups-directory-community");
  updateTag("groups-directory-sponsor");
  updateTag("groups-publicity");
  if (previous !== image) {
    await deleteUploadedFileIfUnused(previous);
  }
  return { success: true };
}

export async function updateGroupCoverAction(
  groupId: string,
  coverImage: string | null,
) {
  await requireGroupPermission(groupId, "group.media");
  const previous = await updateGroupCover({
    id: groupId,
    coverImage: groupImageSchema.parse(coverImage),
  });
  updateTag(`group-info-${groupId}`);
  if (previous !== coverImage) {
    await deleteUploadedFileIfUnused(previous);
  }
  return { success: true };
}

export async function createGroupAction(input: z.infer<typeof createGroupSchema>) {
  try {
    await requireSuperadmin();
    const data = createGroupSchema.parse(input);
    await createGroup({
      id: data.id,
      kind: data.kind,
      name: data.name,
      description: data.description ?? null,
      regionLabel: data.regionLabel ?? null,
      websiteUrl: data.websiteUrl || null,
      sponsorshipStatus: data.kind === "sponsor" ? "inactive" : "inactive",
      publicityEnabled: false,
    });
    updateTag(`groups-directory-${data.kind}`);
    return { data: { id: data.id }, error: null };
  } catch (error) {
    return { data: null, error: getErrorMessage(error) };
  }
}

export async function setSponsorshipAction(
  input: z.infer<typeof setSponsorshipSchema>,
) {
  try {
    await requireSuperadmin();
    const data = setSponsorshipSchema.parse(input);
    await setSponsorshipStatus({
      id: data.groupId,
      sponsorshipStatus: data.sponsorshipStatus,
      publicityEnabled: data.publicityEnabled,
      sponsorshipExpiresAt: data.sponsorshipExpiresAt
        ? new Date(data.sponsorshipExpiresAt)
        : null,
    });
    updateTag(`group-info-${data.groupId}`);
    updateTag("groups-directory-sponsor");
    updateTag("groups-publicity");
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: getErrorMessage(error) };
  }
}
