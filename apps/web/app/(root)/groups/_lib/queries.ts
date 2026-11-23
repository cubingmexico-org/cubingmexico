"use cache";

import "server-only";

import { db } from "@workspace/db";
import {
  event,
  group,
  groupMembership,
  groupRankAverage,
  groupRankSingle,
  groupRecordMarker,
  person,
  state,
  type GroupKind,
} from "@workspace/db/schema";
import { and, asc, count, eq, gt, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { inOfficialEvents } from "@/lib/official-events";

export async function getGroupsByKind(
  kind: GroupKind,
  opts?: { publicOnly?: boolean },
) {
  cacheLife("days");
  cacheTag(`groups-directory-${kind}`);

  const publicOnly = opts?.publicOnly ?? kind === "sponsor";

  const where = and(
    eq(group.kind, kind),
    eq(group.isActive, true),
    publicOnly && kind === "sponsor"
      ? eq(group.sponsorshipStatus, "active")
      : undefined,
  );

  const rows = await db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      description: group.description,
      image: group.image,
      coverImage: group.coverImage,
      regionLabel: group.regionLabel,
      websiteUrl: group.websiteUrl,
      founded: group.founded,
      isActive: group.isActive,
      sponsorshipStatus: group.sponsorshipStatus,
      members: count(groupMembership.personId),
    })
    .from(group)
    .leftJoin(
      groupMembership,
      and(
        eq(groupMembership.groupId, group.id),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .where(where)
    .groupBy(
      group.id,
      group.kind,
      group.name,
      group.description,
      group.image,
      group.coverImage,
      group.regionLabel,
      group.websiteUrl,
      group.founded,
      group.isActive,
      group.sponsorshipStatus,
    )
    .orderBy(asc(group.name));

  return rows;
}

export async function getPublicitySponsors() {
  cacheLife("days");
  cacheTag("groups-publicity");

  return db
    .select({
      id: group.id,
      name: group.name,
      image: group.image,
      icon: group.icon,
      websiteUrl: group.websiteUrl,
      publicityBlurb: group.publicityBlurb,
    })
    .from(group)
    .where(
      and(
        eq(group.kind, "sponsor"),
        eq(group.isActive, true),
        eq(group.sponsorshipStatus, "active"),
        eq(group.publicityEnabled, true),
      ),
    )
    .orderBy(asc(group.name));
}

export async function getGroupInfo(groupId: string) {
  cacheLife("days");
  cacheTag(`group-info-${groupId}`);

  const [row] = await db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      description: group.description,
      image: group.image,
      icon: group.icon,
      coverImage: group.coverImage,
      founded: group.founded,
      socialLinks: group.socialLinks,
      isActive: group.isActive,
      regionLabel: group.regionLabel,
      websiteUrl: group.websiteUrl,
      sponsorshipStatus: group.sponsorshipStatus,
      sponsorshipExpiresAt: group.sponsorshipExpiresAt,
      publicityEnabled: group.publicityEnabled,
      publicityBlurb: group.publicityBlurb,
    })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);

  return row ?? null;
}

export async function getGroupTotalMembers(groupId: string) {
  cacheLife("days");
  cacheTag(`group-total-members-${groupId}`);

  const [row] = await db
    .select({ total: count() })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    );

  return row?.total ?? 0;
}

export async function getGroupShellData(groupId: string) {
  const [info, totalMembers] = await Promise.all([
    getGroupInfo(groupId),
    getGroupTotalMembers(groupId),
  ]);
  if (!info) return null;
  return { group: info, totalMembers };
}

export async function getGroupMembers(groupId: string) {
  cacheLife("days");
  cacheTag(`group-members-${groupId}`);

  return db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      gender: person.gender,
      state: state.name,
      stateId: person.stateId,
      specialties: groupMembership.specialties,
      role: groupMembership.role,
      hideFromRoster: groupMembership.hideFromRoster,
    })
    .from(groupMembership)
    .innerJoin(person, eq(groupMembership.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(eq(groupMembership.groupId, groupId))
    .orderBy(asc(person.name));
}

export async function getGroupTopMembers(groupId: string, limit = 5) {
  cacheLife("days");
  cacheTag(`group-top-members-${groupId}`);

  return db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      bestRank: sql<number>`min(${groupRankSingle.groupRank})`.mapWith(Number),
    })
    .from(groupMembership)
    .innerJoin(person, eq(groupMembership.personId, person.wcaId))
    .leftJoin(
      groupRankSingle,
      and(
        eq(groupRankSingle.groupId, groupId),
        eq(groupRankSingle.personId, person.wcaId),
        eq(groupRankSingle.eventId, "333"),
      ),
    )
    .where(
      and(
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .groupBy(person.wcaId, person.name)
    .orderBy(
      sql`min(${groupRankSingle.groupRank}) asc nulls last`,
      asc(person.name),
    )
    .limit(limit);
}

export async function getGroupCurrentRecords(groupId: string) {
  cacheLife("days");
  cacheTag(`group-records-${groupId}`);

  const memberIds = await db
    .select({ personId: groupMembership.personId })
    .from(groupMembership)
    .where(eq(groupMembership.groupId, groupId));

  const ids = memberIds.map((m) => m.personId);
  if (ids.length === 0) {
    return [] as {
      eventId: string;
      eventName: string | null;
      type: "single" | "average";
      best: number;
      personId: string;
      personName: string | null;
      groupRank: number | null;
    }[];
  }

  const [singles, averages] = await Promise.all([
    db
      .select({
        eventId: groupRankSingle.eventId,
        eventName: event.name,
        best: groupRankSingle.best,
        personId: groupRankSingle.personId,
        personName: person.name,
        groupRank: groupRankSingle.groupRank,
      })
      .from(groupRankSingle)
      .innerJoin(event, eq(groupRankSingle.eventId, event.id))
      .innerJoin(person, eq(groupRankSingle.personId, person.wcaId))
      .where(
        and(
          eq(groupRankSingle.groupId, groupId),
          eq(groupRankSingle.groupRank, 1),
          gt(groupRankSingle.best, 0),
          inOfficialEvents(groupRankSingle.eventId),
        ),
      )
      .orderBy(asc(event.rank)),
    db
      .select({
        eventId: groupRankAverage.eventId,
        eventName: event.name,
        best: groupRankAverage.best,
        personId: groupRankAverage.personId,
        personName: person.name,
        groupRank: groupRankAverage.groupRank,
      })
      .from(groupRankAverage)
      .innerJoin(event, eq(groupRankAverage.eventId, event.id))
      .innerJoin(person, eq(groupRankAverage.personId, person.wcaId))
      .where(
        and(
          eq(groupRankAverage.groupId, groupId),
          eq(groupRankAverage.groupRank, 1),
          gt(groupRankAverage.best, 0),
          inOfficialEvents(groupRankAverage.eventId),
        ),
      )
      .orderBy(asc(event.rank)),
  ]);

  return [
    ...singles.map((row) => ({ ...row, type: "single" as const })),
    ...averages.map((row) => ({ ...row, type: "average" as const })),
  ];
}

export async function getGroupHistoricalRecordCount(groupId: string) {
  cacheLife("days");
  cacheTag(`group-records-${groupId}`);

  const [row] = await db
    .select({ total: count() })
    .from(groupRecordMarker)
    .where(eq(groupRecordMarker.groupId, groupId));

  return row?.total ?? 0;
}

export async function getPersonGroups(wcaId: string) {
  cacheLife("days");
  cacheTag(`person-groups-${wcaId}`);

  return db
    .select({
      id: group.id,
      kind: group.kind,
      name: group.name,
      image: group.image,
      icon: group.icon,
      role: groupMembership.role,
    })
    .from(groupMembership)
    .innerJoin(group, eq(groupMembership.groupId, group.id))
    .where(and(eq(groupMembership.personId, wcaId), eq(group.isActive, true)))
    .orderBy(asc(group.kind), asc(group.name));
}

export async function getGroupRanks(
  groupId: string,
  eventId: string,
  rankType: "single" | "average",
) {
  cacheLife("days");
  cacheTag(`group-ranks-${groupId}`);

  const table = rankType === "single" ? groupRankSingle : groupRankAverage;

  return db
    .select({
      personId: table.personId,
      name: person.name,
      best: table.best,
      groupRank: table.groupRank,
      state: state.name,
      stateId: person.stateId,
      gender: person.gender,
    })
    .from(table)
    .innerJoin(person, eq(table.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(and(eq(table.groupId, groupId), eq(table.eventId, eventId)))
    .orderBy(asc(table.groupRank));
}
