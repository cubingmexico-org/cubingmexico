import { db } from "@workspace/db";
import {
  ccEvent,
  ccPerson,
  ccResult,
  ccResultPerson,
  competition,
  competitionRoundDate,
  event,
  kinchRanks,
  nemesisStats,
  person,
  rankAverage,
  rankSingle,
  result,
  roundType,
  streakRanks,
  sumOfRanks,
} from "@workspace/db/schema";

type EventInsert = typeof event.$inferInsert;
type PersonInsert = typeof person.$inferInsert;
type CompetitionInsert = typeof competition.$inferInsert;
type RoundTypeInsert = typeof roundType.$inferInsert;
type RankInsert = typeof rankSingle.$inferInsert;
type ResultInsert = typeof result.$inferInsert;
type RoundDateInsert = typeof competitionRoundDate.$inferInsert;

export async function insertEvent(
  values: Partial<EventInsert> & Pick<EventInsert, "id">,
) {
  await db.insert(event).values({
    format: "time",
    name: values.id,
    rank: 0,
    ...values,
  });
}

/** One event per scope bucket: official, deprecated, announced (never counted) and 333mbo (no cross-event column). */
export async function insertScopeEvents() {
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 996 });
  await insertEvent({
    id: "333mbo",
    name: "3x3x3 Multi-Blind Old Style",
    rank: 999,
  });
  await insertEvent({ id: "fto", name: "Face-Turning Octahedron", rank: 810 });
}

export async function insertPerson(
  values: Partial<PersonInsert> & Pick<PersonInsert, "wcaId">,
) {
  await db.insert(person).values({
    name: `Person ${values.wcaId}`,
    gender: "m",
    stateId: null,
    ...values,
  });
}

export async function insertCompetition(
  values: Partial<CompetitionInsert> & Pick<CompetitionInsert, "id">,
) {
  const startDate = values.startDate ?? new Date("2024-01-01T00:00:00Z");
  await db.insert(competition).values({
    name: values.id,
    venue: "Venue",
    cityName: "Ciudad de México",
    countryId: "Mexico",
    cellName: values.id.slice(0, 45),
    endDate: startDate,
    ...values,
    startDate,
  });
}

export async function insertRoundType(
  values: Partial<RoundTypeInsert> & Pick<RoundTypeInsert, "id">,
) {
  await db.insert(roundType).values({
    name: `Round ${values.id}`,
    cellName: `Round ${values.id}`,
    final: values.id === "f",
    rank: 0,
    ...values,
  });
}

type RankFactoryInput = Pick<RankInsert, "personId" | "eventId" | "best"> &
  Partial<RankInsert>;

function rankDefaults(values: RankFactoryInput): RankInsert {
  return {
    worldRank: values.countryRank ?? 1,
    continentRank: values.countryRank ?? 1,
    countryRank: 1,
    ...values,
  };
}

export async function insertRankSingle(values: RankFactoryInput) {
  await db.insert(rankSingle).values(rankDefaults(values));
}

export async function insertRankAverage(values: RankFactoryInput) {
  await db.insert(rankAverage).values(rankDefaults(values));
}

export async function insertResult(
  values: Partial<ResultInsert> &
    Pick<ResultInsert, "id" | "competitionId" | "eventId" | "personId">,
) {
  await db.insert(result).values({
    best: 0,
    average: 0,
    formatId: "a",
    roundTypeId: null,
    ...values,
  });
}

type CcEventInsert = typeof ccEvent.$inferInsert;
type CcPersonInsert = typeof ccPerson.$inferInsert;
type CcResultInsert = typeof ccResult.$inferInsert;

export async function insertCcEvent(
  values: Partial<CcEventInsert> & Pick<CcEventInsert, "id">,
) {
  await db.insert(ccEvent).values({
    name: values.id,
    format: "time",
    rank: 1000,
    participants: 1,
    ...values,
  });
}

export async function insertCcPerson(
  values: Partial<CcPersonInsert> & Pick<CcPersonInsert, "id">,
) {
  await db.insert(ccPerson).values({
    name: `CC Person ${values.id}`,
    regionCode: "MX",
    wcaId: null,
    ...values,
  });
}

/** Inserts the result and one `cc_result_persons` row per `personIds` entry, in order. */
export async function insertCcResult(
  values: Partial<CcResultInsert> &
    Pick<CcResultInsert, "id" | "competitionId" | "eventId"> & {
      personIds: number[];
    },
) {
  const { personIds, ...resultValues } = values;
  await db.insert(ccResult).values({
    roundTypeId: "f",
    roundNumber: 1,
    formatId: "a",
    pos: 1,
    best: 0,
    average: 0,
    attempts: [],
    date: new Date("2024-06-01T00:00:00Z"),
    ...resultValues,
  });
  await db.insert(ccResultPerson).values(
    personIds.map((personId, position) => ({
      resultId: values.id,
      personId,
      position,
    })),
  );
}

type KinchRankInsert = typeof kinchRanks.$inferInsert;
type SumOfRanksInsert = typeof sumOfRanks.$inferInsert;
type StreakRankInsert = typeof streakRanks.$inferInsert;
type NemesisStatInsert = typeof nemesisStats.$inferInsert;

export async function insertKinchRank(
  values: Partial<KinchRankInsert> &
    Pick<KinchRankInsert, "personId" | "scope">,
) {
  await db.insert(kinchRanks).values({
    rank: 1,
    overall: 0,
    events: [],
    ...values,
  });
}

export async function insertSumOfRanks(
  values: Partial<SumOfRanksInsert> &
    Pick<SumOfRanksInsert, "personId" | "scope" | "resultType">,
) {
  await db.insert(sumOfRanks).values({
    rank: 1,
    overall: 0,
    events: [],
    ...values,
  });
}

export async function insertStreakRank(
  values: Partial<StreakRankInsert> &
    Pick<StreakRankInsert, "personId" | "scope">,
) {
  await db.insert(streakRanks).values({ rank: 1, ...values });
}

export async function insertNemesisStat(
  values: Partial<NemesisStatInsert> &
    Pick<NemesisStatInsert, "personId" | "scope">,
) {
  await db.insert(nemesisStats).values(values);
}

export async function insertCompetitionRoundDate(
  values: Partial<RoundDateInsert> &
    Pick<
      RoundDateInsert,
      "competitionId" | "eventId" | "roundTypeId" | "endDate"
    >,
) {
  await db.insert(competitionRoundDate).values({
    source: "manual",
    ...values,
  });
}
