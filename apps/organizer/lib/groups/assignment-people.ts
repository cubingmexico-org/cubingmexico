/** Who someone is for group assignment purposes (roles, newcomers, seeds) and competitor ordering. */

import {
  type Assignment,
  type EventId,
  type Person,
  personalBestValue,
  type WCIF,
} from "@/types/wcif";
import type { CompetitorsSortingRule } from "@/lib/groups/config";
import { seedRankFromWcif } from "@/lib/groups/wcif-seed";
import {
  getGroupActivitiesForRound,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";

export const COMPETITOR = "competitor";
export const STAFF_JUDGE = "staff-judge";
export const STAFF_SCRAMBLER = "staff-scrambler";
export const STAFF_RUNNER = "staff-runner";

const BALANCED_EVENTS = new Set([
  "333",
  "222",
  "333bf",
  "333oh",
  "333ft",
  "pyram",
  "skewb",
  "clock",
  "sq1",
]);

const BUSY_ROLES = new Set([
  "delegate",
  "trainee-delegate",
  "organizer",
  "staff-dataentry",
]);

export function isDelegateOrOrganizer(person: Person): boolean {
  return (person.roles ?? []).some(
    (role) =>
      role === "delegate" ||
      role === "trainee-delegate" ||
      role === "organizer",
  );
}

export function isBusyOfficial(person: Person): boolean {
  return (person.roles ?? []).some((role) => BUSY_ROLES.has(role));
}

export function hasStaffRole(person: Person): boolean {
  return (person.roles ?? []).some((role) => role.startsWith("staff-"));
}

export function hasSpecificStaffRole(person: Person, role: string): boolean {
  return (person.roles ?? []).includes(role as never);
}

export function isNewcomer(person: Person): boolean {
  return !person.wcaId;
}

function competitionCountryIso2(wcif: WCIF): string | null {
  return wcif.schedule.venues[0]?.countryIso2 ?? null;
}

export function isForeigner(wcif: WCIF, person: Person): boolean {
  const iso = competitionCountryIso2(wcif);
  if (!iso) return false;
  return person.countryIso2 !== iso;
}

export function isInRound(person: Person, eventId: string): boolean {
  return (
    person.registration?.isCompeting === true &&
    (person.registration.eventIds ?? []).includes(eventId as EventId)
  );
}

export function competitorAssignment(
  person: Person,
  groupIds: Set<number>,
): Assignment | undefined {
  return (person.assignments ?? []).find(
    (a) => a.assignmentCode === COMPETITOR && groupIds.has(a.activityId),
  );
}

export function staffAssignmentsInRound(
  person: Person,
  groupIds: Set<number>,
): Assignment[] {
  return (person.assignments ?? []).filter(
    (a) => a.assignmentCode !== COMPETITOR && groupIds.has(a.activityId),
  );
}

export function staffAssignmentCount(person: Person): number {
  return (person.assignments ?? []).filter(
    (a) => a.assignmentCode !== COMPETITOR,
  ).length;
}

function seedRank(person: Person, eventId: string, wcif: WCIF): number {
  return seedRankFromWcif(person, eventId, wcif);
}

export function bestAverageAndSingle(
  person: Person,
  eventId: string,
): [number, number] {
  const avg =
    personalBestValue(
      (person.personalBests ?? []).find(
        (b) => b.eventId === eventId && b.type === "average",
      ),
    ) ?? Number.MAX_SAFE_INTEGER;
  const single =
    personalBestValue(
      (person.personalBests ?? []).find(
        (b) => b.eventId === eventId && b.type === "single",
      ),
    ) ?? Number.MAX_SAFE_INTEGER;
  if (["333bf", "444bf", "555bf", "333mbf"].includes(eventId)) {
    return [single, avg];
  }
  return [avg, single];
}

export function sortBySeedThenName(
  a: Person,
  b: Person,
  eventId: string,
  wcif: WCIF,
): number {
  const seedDiff = seedRank(a, eventId, wcif) - seedRank(b, eventId, wcif);
  if (seedDiff !== 0) return seedDiff;
  return a.name.localeCompare(b.name, "es");
}

export function sortCompetitorsForRound(
  competitors: Person[],
  eventId: string,
  wcif: WCIF,
  roundActivityCode: string,
  rule: CompetitorsSortingRule,
): Person[] {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const isFirstRound = (parsed?.roundNumber ?? 1) === 1;
  const byRanks = [...competitors].sort((a, b) =>
    sortBySeedThenName(a, b, eventId, wcif),
  );

  if (!isFirstRound) return byRanks;

  if (rule === "ranks") return byRanks;

  if (rule === "balanced" && BALANCED_EVENTS.has(eventId)) {
    return byRanks;
  }

  if (rule === "balanced" || rule === "symmetric") {
    const groupCount = Math.max(
      1,
      getGroupActivitiesForRound(wcif, roundActivityCode).length,
    );
    return [...byRanks].sort((a, b) => {
      const ia = byRanks.indexOf(a);
      const ib = byRanks.indexOf(b);
      const sa = groupCount - ((byRanks.length - ia - 1) % groupCount);
      const sb = groupCount - ((byRanks.length - ib - 1) % groupCount);
      if (sa !== sb) return sa - sb;
      return ia - ib;
    });
  }

  if (rule === "name-optimised") {
    const byName = new Map<string, Person[]>();
    for (const person of byRanks) {
      const first = person.name.split(/\s+/)[0] ?? person.name;
      const list = byName.get(first) ?? [];
      list.push(person);
      byName.set(first, list);
    }
    const sets = [...byName.values()].sort((a, b) => a.length - b.length);
    let competitorsAcc: Person[] = [];
    for (const sameName of sets) {
      if (competitorsAcc.length === 0) {
        competitorsAcc = [...sameName];
        continue;
      }
      const chunkSize = Math.ceil(
        competitorsAcc.length / Math.max(sameName.length, 1),
      );
      const chunks: Person[][] = [];
      for (let i = 0; i < competitorsAcc.length; i += chunkSize) {
        chunks.push(competitorsAcc.slice(i, i + chunkSize));
      }
      const next: Person[] = [];
      for (let i = 0; i < Math.max(chunks.length, sameName.length); i++) {
        if (chunks[i]) next.push(...chunks[i]!);
        if (sameName[i]) next.push(sameName[i]!);
      }
      competitorsAcc = next;
    }
    return competitorsAcc;
  }

  return byRanks;
}
