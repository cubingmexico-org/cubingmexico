import "server-only";

import { db } from "@workspace/db";
import {
  group,
  groupMembership,
  type Group,
  type GroupMembership,
  type Person,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

export async function saveGroup({
  id,
  name,
  description,
  socialLinks,
  founded,
  isActive,
  regionLabel,
  websiteUrl,
  publicityBlurb,
}: {
  id: Group["id"];
  name: Group["name"];
  description: Group["description"];
  socialLinks: Group["socialLinks"];
  founded: Group["founded"];
  isActive: Group["isActive"];
  regionLabel?: Group["regionLabel"];
  websiteUrl?: Group["websiteUrl"];
  publicityBlurb?: Group["publicityBlurb"];
}) {
  await db
    .update(group)
    .set({
      name,
      description,
      socialLinks,
      founded,
      isActive,
      ...(regionLabel !== undefined ? { regionLabel } : {}),
      ...(websiteUrl !== undefined ? { websiteUrl } : {}),
      ...(publicityBlurb !== undefined ? { publicityBlurb } : {}),
    })
    .where(eq(group.id, id));
}

export async function updateGroupLogo({
  id,
  image,
}: {
  id: Group["id"];
  image: Group["image"];
}): Promise<Group["image"]> {
  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select({ image: group.image })
      .from(group)
      .where(eq(group.id, id))
      .for("update");
    await tx.update(group).set({ image }).where(eq(group.id, id));
    return previous?.image ?? null;
  });
}

export async function updateGroupCover({
  id,
  coverImage,
}: {
  id: Group["id"];
  coverImage: Group["coverImage"];
}): Promise<Group["coverImage"]> {
  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select({ coverImage: group.coverImage })
      .from(group)
      .where(eq(group.id, id))
      .for("update");
    await tx.update(group).set({ coverImage }).where(eq(group.id, id));
    return previous?.coverImage ?? null;
  });
}

/** Hard-delete a group and cascaded memberships/ranks/records. Returns image URLs for cleanup. */
export async function deleteGroup(id: Group["id"]): Promise<{
  kind: Group["kind"];
  image: Group["image"];
  coverImage: Group["coverImage"];
} | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        kind: group.kind,
        image: group.image,
        coverImage: group.coverImage,
      })
      .from(group)
      .where(eq(group.id, id))
      .for("update");
    if (!row) return null;
    await tx.delete(group).where(eq(group.id, id));
    return row;
  });
}

export async function createGroup(values: {
  id: Group["id"];
  kind: Group["kind"];
  name: Group["name"];
  description?: Group["description"];
  regionLabel?: Group["regionLabel"];
  websiteUrl?: Group["websiteUrl"];
  sponsorshipStatus?: Group["sponsorshipStatus"];
  publicityEnabled?: Group["publicityEnabled"];
}) {
  await db.insert(group).values({
    id: values.id,
    kind: values.kind,
    name: values.name,
    description: values.description ?? null,
    regionLabel: values.regionLabel ?? null,
    websiteUrl: values.websiteUrl ?? null,
    sponsorshipStatus: values.sponsorshipStatus ?? "inactive",
    publicityEnabled: values.publicityEnabled ?? false,
    isActive: true,
  });
}

export async function setSponsorshipStatus({
  id,
  sponsorshipStatus,
  sponsorshipExpiresAt,
  publicityEnabled,
}: {
  id: Group["id"];
  sponsorshipStatus: Group["sponsorshipStatus"];
  sponsorshipExpiresAt?: Group["sponsorshipExpiresAt"];
  publicityEnabled?: Group["publicityEnabled"];
}) {
  await db
    .update(group)
    .set({
      sponsorshipStatus,
      ...(sponsorshipExpiresAt !== undefined ? { sponsorshipExpiresAt } : {}),
      ...(publicityEnabled !== undefined ? { publicityEnabled } : {}),
    })
    .where(eq(group.id, id));
}

export async function addGroupMember({
  groupId,
  personId,
  specialties,
  achievements,
}: {
  groupId: Group["id"];
  personId: Person["wcaId"];
  specialties: GroupMembership["specialties"];
  achievements: GroupMembership["achievements"];
}) {
  await db
    .insert(groupMembership)
    .values({
      groupId,
      personId,
      specialties,
      achievements,
    })
    .onConflictDoUpdate({
      target: [groupMembership.groupId, groupMembership.personId],
      set: {
        specialties,
        achievements,
      },
    });
}

export async function removeGroupMembers({
  groupId,
  personIds,
}: {
  groupId: Group["id"];
  personIds: string[];
}) {
  if (personIds.length === 0) return;
  for (const personId of personIds) {
    await db
      .delete(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, groupId),
          eq(groupMembership.personId, personId),
        ),
      );
  }
}

export async function updateGroupMemberRole({
  groupId,
  personId,
  role,
}: {
  groupId: Group["id"];
  personId: Person["wcaId"];
  role: GroupMembership["role"];
}) {
  await db
    .update(groupMembership)
    .set({ role })
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.personId, personId),
      ),
    );
}
