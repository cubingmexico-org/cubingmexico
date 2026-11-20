import type { Person, WCIF } from "@/types/wcif";

/**
 * Match a signed-in WCA subject (`wcaId` or numeric account id string) to a
 * registered person on the public WCIF.
 */
export function findPersonForClaim(
  wcif: WCIF,
  subject: string,
): Person | undefined {
  const normalized = subject.trim();
  if (!normalized) return undefined;

  return wcif.persons.find((person) => {
    if (person.registrantId === null) return false;
    if (person.wcaId && person.wcaId === normalized) return true;
    return String(person.wcaUserId) === normalized;
  });
}
