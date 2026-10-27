import "server-only";
import { db } from "@workspace/db";
import {
  Person,
  State,
  Team,
  team,
  teamMember,
  person,
  TeamMember,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// Writes live here and not in db/queries.ts: a file-level "use cache" caches every export,
// so a repeated write with the same arguments would be served from the cache and skipped.

export async function saveTeam({
  stateId,
  name,
  description,
  socialLinks,
  founded,
  isActive,
}: {
  stateId: State["id"];
  name: Team["name"];
  description: Team["description"];
  socialLinks: Team["socialLinks"];
  founded: Team["founded"];
  isActive: Team["isActive"];
}) {
  await db
    .update(team)
    .set({
      name,
      description,
      socialLinks,
      founded,
      isActive,
    })
    .where(eq(team.stateId, stateId));
}

export async function saveProfile({
  stateId,
  personId,
}: {
  stateId: State["id"];
  personId: Person["wcaId"];
}) {
  await db
    .update(person)
    .set({
      stateId,
    })
    .where(eq(person.wcaId, personId));
}

export async function saveProfileSpecialties({
  personId,
  specialties,
}: {
  personId: Person["wcaId"];
  specialties: TeamMember["specialties"];
}) {
  await db
    .insert(teamMember)
    .values({
      personId,
      specialties,
    })
    .onConflictDoUpdate({
      target: [teamMember.personId],
      set: {
        specialties,
      },
    });
}

/** Sets (or clears, with null) the team logo and returns the previous one. */
export async function updateTeamLogo({
  stateId,
  image,
}: {
  stateId: State["id"];
  image: Team["image"];
}): Promise<Team["image"]> {
  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select({ image: team.image })
      .from(team)
      .where(eq(team.stateId, stateId))
      .for("update");
    await tx.update(team).set({ image }).where(eq(team.stateId, stateId));
    return previous?.image ?? null;
  });
}

/** Sets (or clears, with null) the team cover and returns the previous one. */
export async function updateTeamCover({
  stateId,
  coverImage,
}: {
  stateId: State["id"];
  coverImage: Team["coverImage"];
}): Promise<Team["coverImage"]> {
  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select({ coverImage: team.coverImage })
      .from(team)
      .where(eq(team.stateId, stateId))
      .for("update");
    await tx.update(team).set({ coverImage }).where(eq(team.stateId, stateId));
    return previous?.coverImage ?? null;
  });
}

export async function addMember({
  personId,
  stateId,
  specialties,
  achievements,
}: {
  stateId: State["id"];
  personId: Person["wcaId"];
  specialties: TeamMember["specialties"];
  achievements: TeamMember["achievements"];
}) {
  await db.transaction(async (tx) => {
    await tx
      .update(person)
      .set({
        stateId,
      })
      .where(eq(person.wcaId, personId));

    await tx
      .insert(teamMember)
      .values({
        personId,
        specialties,
        achievements,
      })
      .onConflictDoUpdate({
        target: [teamMember.personId],
        set: {
          specialties,
          achievements,
        },
      });
  });
}
