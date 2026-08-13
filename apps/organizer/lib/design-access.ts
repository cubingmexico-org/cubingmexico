import type { DesignModule } from "@workspace/db/schema";
import type { Competition } from "@/types/wca";
import { getCompetitionById } from "@/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const DESIGN_MODULES = [
  "certificate_podium",
  "certificate_participation",
  "badges",
] as const satisfies readonly DesignModule[];

export function isDesignModule(value: string): value is DesignModule {
  return (DESIGN_MODULES as readonly string[]).includes(value);
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export async function requireSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}

function personMatchesUser(
  person: { id: number; wca_id: string | null },
  userId: string,
): boolean {
  if (person.wca_id && person.wca_id === userId) {
    return true;
  }
  return String(person.id) === userId;
}

export function userManagesCompetition(
  userId: string,
  competition: Competition,
): boolean {
  return (
    competition.organizers.some((organizer) =>
      personMatchesUser(organizer, userId),
    ) ||
    competition.delegates.some((delegate) =>
      personMatchesUser(delegate, userId),
    )
  );
}

export async function assertManagesCompetition(
  userId: string,
  competitionId: string,
): Promise<{ ok: true; competition: Competition } | { ok: false }> {
  const competition = await getCompetitionById({ id: competitionId });
  if (!competition || !userManagesCompetition(userId, competition)) {
    return { ok: false };
  }
  return { ok: true, competition };
}

export function canReadDesign(params: {
  userId: string;
  competitionId: string | null;
  userIdOwner: string;
  isPublic: boolean;
  ownerScope: "user" | "org" | "global";
  managesCompetition: boolean;
}): boolean {
  if (params.competitionId) {
    return params.managesCompetition;
  }

  if (params.ownerScope === "org" || params.ownerScope === "global") {
    return true;
  }

  if (params.isPublic) {
    return true;
  }

  return params.userIdOwner === params.userId;
}

export function canWriteDesign(params: {
  userId: string;
  competitionId: string | null;
  userIdOwner: string;
  ownerScope: "user" | "org" | "global";
  managesCompetition: boolean;
}): boolean {
  if (params.competitionId) {
    return params.managesCompetition;
  }

  // org/global templates are seed-managed in Phase 1
  if (params.ownerScope === "org" || params.ownerScope === "global") {
    return false;
  }

  return params.userIdOwner === params.userId;
}
