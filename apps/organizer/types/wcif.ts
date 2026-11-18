/**
 * WCIF types used by Organización.
 *
 * Source of truth: https://github.com/thewca/wcif (v2.2)
 * Fetch: GET /api/v0/competitions/:id/wcif/latest
 *
 * Consumed today:
 * - persons: name, wcaId, registrantId, countryIso2, gender, roles,
 *   registration.eventIds / isCompeting, avatar.url, assignments,
 *   personalBests; authorized WCIF also has birthdate / email (server-only)
 * - events → rounds → results: personId, ranking, best, average
 * - schedule → venues → rooms → activities / childActivities (Grupos draft)
 *
 * Typed for future modules but not consumed yet:
 * - competitorLimit, participationRuleset, qualification
 *
 * Grupos 3b+: optional PATCH via PUT /api/v0/competitions/wcif/check then
 * PATCH …/wcif; surface response.error on failure. Extensions are read for
 * Groupifier/DD interop; Organización writes `organizacion.CompetitionConfig`,
 * `organizacion.RoomConfig`, and `organizacion.ActivityConfig` on the local draft.
 */

export const WCIF_VERSION = "2.2";

export type EventId =
  | "333"
  | "222"
  | "444"
  | "555"
  | "666"
  | "777"
  | "333bf"
  | "333fm"
  | "333oh"
  | "333ft"
  | "clock"
  | "minx"
  | "pyram"
  | "skewb"
  | "sq1"
  | "444bf"
  | "555bf"
  | "333mbf"
  | "fto";

export type RoundFormat = "1" | "2" | "3" | "5" | "a" | "m" | "h";

export interface Avatar {
  url: string;
  thumbUrl: string;
}

/** WCIF role strings commonly returned on persons.roles */
export type Role =
  | "delegate"
  | "trainee-delegate"
  | "organizer"
  | "staff-judge"
  | "staff-scrambler"
  | "staff-runner"
  | "staff-dataentry"
  | "staff-announcer"
  | "staff-other";

export interface WcifExtension {
  id: string;
  specUrl?: string;
  data: unknown;
}

export interface Person {
  name: string;
  wcaUserId: number;
  wcaId: string | null;
  /** null when the person is not a registered competitor */
  registrantId: number | null;
  countryIso2: string;
  gender: "m" | "f" | "o" | null;
  registration: Registration | null;
  avatar: Avatar | null;
  roles: Role[];
  assignments: Assignment[];
  personalBests: PersonalBest[];
  extensions: WcifExtension[];
  /**
   * Present only on the authorized WCIF (`manage_competitions`).
   * Never expose these to the client from list APIs.
   */
  birthdate?: string;
  email?: string;
}

interface Registration {
  wcaRegistrationId: number;
  eventIds: EventId[];
  status: string;
  isCompeting: boolean;
}

export interface Assignment {
  activityId: number;
  stationNumber: number | null;
  /** WCIF uses "competitor" plus staff-* / custom staff codes */
  assignmentCode: string;
}

export interface PersonalBest {
  eventId: EventId;
  value: number;
  worldRanking: number | null;
  continentalRanking: number | null;
  nationalRanking: number | null;
  type: "single" | "average";
}

export function personalBestValue(
  pb: Pick<PersonalBest, "value"> | null | undefined,
): number | null {
  if (pb?.value == null) return null;
  return pb.value;
}

export interface Attempt {
  value: number;
  reconstruction?: string | null;
}

export interface Result {
  personId: number;
  ranking: number | null;
  attempts: Attempt[];
  best: number;
  average: number;
}

export interface TimeLimit {
  centiseconds: number;
  cumulativeRoundIds: string[];
}

export interface Cutoff {
  numberOfAttempts: number;
  resultValue: number;
}

export type ResultConditionScope = "single" | "average";

export type ResultCondition =
  | {
      type: "resultAchieved";
      scope: ResultConditionScope;
      value: number | null;
    }
  | {
      type: "ranking";
      scope: ResultConditionScope;
      value: number;
    }
  | {
      type: "percent";
      scope: ResultConditionScope;
      value: number;
    };

export type ParticipationSource =
  | { type: "registrations" }
  | {
      type: "round";
      roundId: string;
      resultCondition: ResultCondition;
    }
  | {
      type: "linkedRounds";
      roundIds: string[];
      resultCondition: ResultCondition;
    };

export interface ReservedPlaces {
  countries: string[];
  count: number;
}

export interface ParticipationRuleset {
  participationSource: ParticipationSource | null;
  reservedPlaces: ReservedPlaces | null;
}

export interface Qualification {
  earliestResultDate: string | null;
  latestResultDate: string;
  resultCondition: ResultCondition;
}

export interface Round {
  id: string;
  format: RoundFormat | string;
  timeLimit: TimeLimit | null;
  cutoff: Cutoff | null;
  participationRuleset: ParticipationRuleset | null;
  linkedRounds: string[] | null;
  scrambleSetCount: number;
  results: Result[];
  extensions: WcifExtension[];
}

export interface Event {
  id: EventId;
  rounds: Round[];
  extensions: WcifExtension[];
  qualification: Qualification | null;
}

export interface WCIF {
  formatVersion: string;
  id: string;
  name: string;
  shortName?: string;
  schedule: Schedule;
  competitorLimit: number | null;
  events: Event[];
  persons: Person[];
  extensions?: WcifExtension[];
}

export interface Schedule {
  startDate: string;
  numberOfDays: number;
  venues: Venue[];
}

export interface Venue {
  id: number;
  name: string;
  latitudeMicrodegrees: number;
  longitudeMicrodegrees: number;
  countryIso2: string;
  timezone: string;
  rooms: Room[];
}

export interface Room {
  id: number;
  name: string;
  color: string;
  activities: Activity[];
  extensions?: WcifExtension[];
}

export interface Activity {
  id: number;
  name: string;
  activityCode: string;
  startTime: string;
  endTime: string;
  childActivities: Activity[];
  scrambleSetId?: number | null;
  extensions?: WcifExtension[];
}

export interface ParticipantData {
  name: string;
  wcaId: string | null;
  registrantId: number | null;
  results: {
    event: EventId;
    average: number;
    ranking: number | null;
  }[];
}

export interface PodiumData {
  name: string;
  place: number;
  event: EventId;
  result: number;
}

export interface ExtendedPerson extends Person {
  stateId: string | null;
}

/** Person with a non-null registrantId (registered competitor). */
export type RegisteredPerson = Person & { registrantId: number };
