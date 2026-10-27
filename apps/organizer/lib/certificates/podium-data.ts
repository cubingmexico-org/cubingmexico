import type { Event, Person, PodiumData, WCIF } from "@/types/wcif";
import { rankingValue } from "./result-format";

export type PodiumFilter = {
  /** Only competitors from this country (ISO2). */
  country?: string | null;
  gender?: "f";
  /** Only competitors without a WCA ID. */
  newcomer?: boolean;
  age?: {
    min: number;
    max: number;
    birthdates: Map<number, string>;
    /** Usually the competition's last day. */
    referenceDate: Date;
  };
};

export function calculateAge(birthdate: string, referenceDate: Date): number {
  const [year, month, day] = birthdate.split("-").map(Number);
  let age = referenceDate.getFullYear() - year!;
  const monthDiff = referenceDate.getMonth() + 1 - month!;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < day!)) {
    age--;
  }
  return age;
}

function matchesFilter(person: Person, filter: PodiumFilter): boolean {
  if (person.registrantId === null) return false;
  if (filter.country !== undefined && person.countryIso2 !== filter.country) {
    return false;
  }
  if (filter.gender && person.gender !== filter.gender) return false;
  if (filter.newcomer && person.wcaId) return false;

  if (filter.age) {
    const birthdate = filter.age.birthdates.get(person.registrantId);
    if (!birthdate) return false;
    const age = calculateAge(birthdate, filter.age.referenceDate);
    if (age < filter.age.min || age > filter.age.max) return false;
  }

  return true;
}

function eventPodium(
  event: Event,
  names: Map<number, string>,
): PodiumData[] | undefined {
  const finalRound = event.rounds[event.rounds.length - 1];
  if (!finalRound) return undefined;
  if (finalRound.results.some((result) => result.ranking === null)) {
    return undefined;
  }

  return finalRound.results
    .filter(
      (result) =>
        names.has(result.personId) && rankingValue(finalRound, result) > 0,
    )
    .sort((a, b) => rankingValue(finalRound, a) - rankingValue(finalRound, b))
    .slice(0, 3)
    .map((result, index) => ({
      name: names.get(result.personId)!,
      place: index + 1,
      event: event.id,
      result: rankingValue(finalRound, result),
    }));
}

/**
 * Top three of every completed event's final round among the competitors that
 * match `filter`. Events whose final still has unranked results are skipped.
 */
export function buildPodiums(wcif: WCIF, filter: PodiumFilter): PodiumData[] {
  const names = new Map<number, string>();
  for (const person of wcif.persons) {
    if (person.registrantId !== null && matchesFilter(person, filter)) {
      names.set(person.registrantId, person.name);
    }
  }

  return wcif.events.flatMap((event) => eventPodium(event, names) ?? []);
}
