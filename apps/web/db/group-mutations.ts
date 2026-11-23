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
