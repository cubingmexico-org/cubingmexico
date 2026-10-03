import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  event,
  person,
  rankAverage,
  rankSingle,
  result,
  roundType,
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
