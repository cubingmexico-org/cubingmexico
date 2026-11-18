import type { WCIF } from "@/types/wcif";

const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** registrantId → YYYY-MM-DD from an authorized WCIF. */
export function birthdatesFromAuthorizedWcif(
  wcif: WCIF,
): Map<number, string> {
  const birthdates = new Map<number, string>();
  for (const person of wcif.persons) {
    if (person.registrantId === null || !person.birthdate) continue;
    if (!BIRTHDATE_RE.test(person.birthdate)) continue;
    birthdates.set(person.registrantId, person.birthdate);
  }
  return birthdates;
}

export type PersonEmail = {
  registrantId: number;
  name: string;
  email: string;
};

/** Competitors with a non-empty email on an authorized WCIF. */
export function emailsFromAuthorizedWcif(wcif: WCIF): Map<number, PersonEmail> {
  const emails = new Map<number, PersonEmail>();
  for (const person of wcif.persons) {
    if (person.registrantId === null) continue;
    const email = person.email?.trim();
    if (!email) continue;
    emails.set(person.registrantId, {
      registrantId: person.registrantId,
      name: person.name,
      email,
    });
  }
  return emails;
}
