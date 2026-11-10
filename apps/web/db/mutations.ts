import "server-only";
import { db } from "@workspace/db";
import {
  Goal,
  GoalTarget,
  Person,
  State,
  Team,
  goal,
  team,
  teamMember,
  person,
  TeamMember,
} from "@workspace/db/schema";
import { and, count, eq } from "drizzle-orm";

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

/** Inserts the goal unless the person already has `limit` goals that year; returns whether it did. */
export async function createGoal({
  personId,
  year,
  target,
  limit,
}: {
  personId: Person["wcaId"];
  year: Goal["year"];
  target: GoalTarget;
  limit: number;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Serializes concurrent creates for the same person so the limit holds.
    await tx
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(eq(person.wcaId, personId))
      .for("update");
    const [existing] = await tx
      .select({ total: count() })
      .from(goal)
      .where(and(eq(goal.personId, personId), eq(goal.year, year)));
    if ((existing?.total ?? 0) >= limit) return false;

    await tx.insert(goal).values({
      id: crypto.randomUUID(),
      personId,
      year,
      type: target.type,
      target,
    });
    return true;
  });
}

export async function updateGoal({
  id,
  target,
}: {
  id: Goal["id"];
  target: GoalTarget;
}) {
  await db
    .update(goal)
    .set({
      type: target.type,
      target,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(goal.id, id));
}

export async function deleteGoal(id: Goal["id"]) {
  await db.delete(goal).where(eq(goal.id, id));
}

export async function setGoalPublic({
  id,
  isPublic,
}: {
  id: Goal["id"];
  isPublic: Goal["isPublic"];
}) {
  await db
    .update(goal)
    .set({ isPublic, updatedAt: new Date() })
    .where(eq(goal.id, id));
}

export async function setGoalCompleted({
  id,
  completed,
}: {
  id: Goal["id"];
  completed: boolean;
}) {
  await db
    .update(goal)
    .set({ completedAt: completed ? new Date() : null, updatedAt: new Date() })
    .where(eq(goal.id, id));
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
