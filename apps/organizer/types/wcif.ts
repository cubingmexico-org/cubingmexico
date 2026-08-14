/**
 * WCIF types used by Organización.
 *
 * Source of truth: https://github.com/thewca/wcif (stable = 1.1)
 * Fetch: GET /api/v0/competitions/:id/wcif/public
 *
 * Consumed today:
 * - persons: name, wcaId, registrantId, countryIso2, gender, roles,
 *   registration.eventIds / isCompeting, avatar.url, assignments,
 *   personalBests
 * - events → rounds → results: personId, ranking, best, average
 * - schedule → venues → rooms → activities / childActivities (Grupos draft)
 *
 * Typed for future modules but not consumed yet:
 * - competitorLimit
 *
 * Grupos 3b+: optional PATCH via PUT …/wcif/check then PATCH …/wcif;
 * surface response.error on failure. Extensions are read for Groupifier/DD
 * interop; Organización writes `organizacion.CompetitionConfig`,
 * `organizacion.RoomConfig`, and `organizacion.ActivityConfig` on the local draft.
 */

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
  | "333mbf";

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
  best: number;
  worldRanking: number | null;
  continentalRanking: number | null;
  nationalRanking: number | null;
  type: "single" | "average";
}

export interface Result {
  personId: number;
  ranking: number | null;
  attempts: unknown[];
  best: number;
  average: number;
}

export interface Round {
  id: string;
  format: string;
  timeLimit: unknown;
  cutoff: unknown;
  advancementCondition: unknown;
  scrambleSetCount: number;
  results: Result[];
  extensions: WcifExtension[];
}

export interface Event {
  id: EventId;
  rounds: Round[];
  extensions: WcifExtension[];
  qualification: unknown;
}

export interface WCIF {
  formatVersion?: string;
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
