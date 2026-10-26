"use client";

import { authClient } from "@/lib/auth-client";
import type { EventId, ExtendedPerson } from "@/types/wcif";

/**
 * Person used to preview badges: the signed-in user's registration when they
 * are a competitor, filled in with sample data otherwise.
 */
export function usePreviewPerson(
  persons: ExtendedPerson[],
  eventIds: EventId[],
): ExtendedPerson {
  const session = authClient.useSession();

  const currentYear = new Date().getFullYear();

  const sessionWcaId =
    session.data?.user?.wcaId || session.data?.user?.id || null;
  const matchedPerson = persons.find(
    (p) =>
      (sessionWcaId && p.wcaId === sessionWcaId) ||
      (sessionWcaId && String(p.wcaUserId) === sessionWcaId),
  );

  return {
    name:
      session.data?.user?.name || matchedPerson?.name || "Leonardo Del Toro",
    wcaId: sessionWcaId || matchedPerson?.wcaId || `${currentYear}ABCD01`,
    avatar: {
      url:
        session.data?.user?.image ||
        matchedPerson?.avatar?.url ||
        "/avatar.png",
      thumbUrl:
        session.data?.user?.image ||
        matchedPerson?.avatar?.thumbUrl ||
        "/avatar.png",
    },
    registration: matchedPerson?.registration ?? { eventIds },
    roles: matchedPerson?.roles ?? [],
    registrantId: matchedPerson?.registrantId ?? 1,
    countryIso2: matchedPerson?.countryIso2 ?? "MX",
    stateId: matchedPerson?.stateId ?? "NAY",
    assignments: matchedPerson?.assignments ?? [],
    wcaUserId: matchedPerson?.wcaUserId ?? 0,
    personalBests: matchedPerson?.personalBests ?? [],
    extensions: matchedPerson?.extensions ?? [],
    gender: matchedPerson?.gender ?? null,
  } as ExtendedPerson;
}
