import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCcEvent,
  insertCcPerson,
  insertCcResult,
  insertCompetition,
  insertPerson,
} from "@/test/factories";
import {
  getCcEventRanking,
  getCcRankingEvents,
  getCcRankingPage,
  getCcRecords,
} from "./queries";
import {
  getCompetitionCcEvents,
  getCompetitionCcResults,
} from "../../competitions/[id]/results/unofficial/_lib/queries";
import {
  getPersonUnofficialResults,
  hasPersonUnofficialResults,
} from "../../persons/[id]/_lib/unofficial";

const ANA = 1;
const BETO = 2;
const FOREIGNER = 3;
const CARLA = 4;

const page = { page: 1, perPage: 10, name: "", state: [] as string[] };

beforeEach(async () => {
  await insertPerson({ wcaId: "2020AAAA01", name: "Ana", stateId: "JAL" });
  await insertPerson({ wcaId: "2020BBBB01", name: "Beto", stateId: "CMX" });

  await insertCompetition({
    id: "Comp2023",
    name: "Comp 2023",
    startDate: new Date("2023-06-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Comp2024",
    name: "Comp 2024",
    startDate: new Date("2024-06-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Euro2024",
    name: "Euro 2024",
    countryId: "France",
    startDate: new Date("2024-07-01T00:00:00Z"),
  });

  await insertCcEvent({
    id: "fto",
    name: "Face-Turning Octahedron",
    rank: 1010,
  });
  await insertCcEvent({
    id: "333_team_bld",
    name: "3x3x3 Team-Blind",
    rank: 1020,
    participants: 2,
  });
  await insertCcEvent({ id: "kilominx", name: "Kilominx", rank: 1060 });

  await insertCcPerson({ id: ANA, name: "Ana", wcaId: "2020AAAA01" });
  await insertCcPerson({ id: BETO, name: "Beto", wcaId: "2020BBBB01" });
  await insertCcPerson({
    id: FOREIGNER,
    name: "François",
    regionCode: "FR",
    wcaId: "2019FRAN01",
  });
  await insertCcPerson({ id: CARLA, name: "Carla" });

  const date2023 = new Date("2023-06-01T00:00:00Z");
  const date2024 = new Date("2024-06-01T00:00:00Z");
  const euroDate = new Date("2024-07-01T00:00:00Z");

  // fto: Ana improves her single in 2024 and ties Beto; the foreigner is faster but not ranked.
  await insertCcResult({
    id: 1,
    competitionId: "Comp2023",
    eventId: "fto",
    personIds: [ANA],
    best: 3000,
    average: 3500,
    attempts: [3000, 3400, 3500, 3600, 3700],
    date: date2023,
  });
  await insertCcResult({
    id: 2,
    competitionId: "Comp2024",
    eventId: "fto",
    personIds: [ANA],
    pos: 2,
    best: 2800,
    average: 3600,
    date: date2024,
  });
  await insertCcResult({
    id: 3,
    competitionId: "Comp2024",
    eventId: "fto",
    personIds: [BETO],
    pos: 3,
    best: 2800,
    average: 3400,
    date: date2024,
  });
  await insertCcResult({
    id: 4,
    competitionId: "Comp2024",
    eventId: "fto",
    personIds: [FOREIGNER],
    pos: 1,
    best: 2000,
    average: 2500,
    date: date2024,
  });
  await insertCcResult({
    id: 5,
    competitionId: "Euro2024",
    eventId: "fto",
    personIds: [CARLA],
    best: 3100,
    average: -1,
    date: euroDate,
  });

  // Team-Blind: the same pair in either order is one team; a pair with a foreigner still counts.
  await insertCcResult({
    id: 10,
    competitionId: "Euro2024",
    eventId: "333_team_bld",
    personIds: [ANA, FOREIGNER],
    best: 5000,
    date: euroDate,
  });
  await insertCcResult({
    id: 11,
    competitionId: "Comp2023",
    eventId: "333_team_bld",
    personIds: [BETO, ANA],
    best: 6000,
    date: date2023,
  });
  await insertCcResult({
    id: 12,
    competitionId: "Comp2024",
    eventId: "333_team_bld",
    personIds: [ANA, BETO],
    best: 5500,
    date: date2024,
  });

  // Only a foreigner competed in kilominx.
  await insertCcResult({
    id: 20,
    competitionId: "Euro2024",
    eventId: "kilominx",
    personIds: [FOREIGNER],
    best: 4000,
    date: euroDate,
  });
});

describe("getCcRankingEvents", () => {
  it("lists only events with Mexican results, in Cubing Contests order", async () => {
    const events = await getCcRankingEvents();
    expect(events.map((event) => event.id)).toEqual(["fto", "333_team_bld"]);
  });
});

describe("getCcEventRanking", () => {
  it("keeps each person's best, shares tied ranks and skips foreigners", async () => {
    const rows = await getCcEventRanking("fto", "single");
    expect(
      rows.map((row) => [row.competitors[0]?.name, row.value, row.countryRank]),
    ).toEqual([
      ["Ana", 2800, 1],
      ["Beto", 2800, 1],
      ["Carla", 3100, 3],
    ]);
    expect(rows[0]?.competitionId).toBe("Comp2024");
  });

  it("ignores DNF averages", async () => {
    const rows = await getCcEventRanking("fto", "average");
    expect(rows.map((row) => [row.competitors[0]?.name, row.value])).toEqual([
      ["Beto", 3400],
      ["Ana", 3500],
    ]);
  });

  it("ranks teams by member set, keeping teams with one Mexican", async () => {
    const rows = await getCcEventRanking("333_team_bld", "single");
    expect(
      rows.map((row) => [
        row.competitors.map((competitor) => competitor.name),
        row.value,
        row.countryRank,
      ]),
    ).toEqual([
      [["Ana", "François"], 5000, 1],
      [["Ana", "Beto"], 5500, 2],
    ]);
  });

  it("links only competitors that exist in persons", async () => {
    const rows = await getCcEventRanking("333_team_bld", "single");
    expect(rows[0]?.competitors).toEqual([
      {
        ccPersonId: ANA,
        name: "Ana",
        wcaId: "2020AAAA01",
        stateName: "Jalisco",
      },
      { ccPersonId: FOREIGNER, name: "François", wcaId: null, stateName: null },
    ]);
  });
});

describe("getCcRankingPage", () => {
  it("filters by state and ranks within it", async () => {
    const { data } = await getCcRankingPage(
      { ...page, state: ["Ciudad de México"] },
      "333_team_bld",
      "single",
    );
    expect(
      data.map((row) => [row.key, row.countryRank, row.stateRank]),
    ).toEqual([[`${ANA}-${BETO}`, 2, 1]]);
  });

  it("filters by any competitor's name", async () => {
    const { data } = await getCcRankingPage(
      { ...page, name: "francois" },
      "333_team_bld",
      "single",
    );
    expect(data.map((row) => row.key)).toEqual([`${ANA}-${FOREIGNER}`]);
  });

  it("paginates", async () => {
    const { data, pageCount } = await getCcRankingPage(
      { ...page, perPage: 2, page: 2 },
      "fto",
      "single",
    );
    expect(pageCount).toBe(2);
    expect(data.map((row) => row.competitors[0]?.name)).toEqual(["Carla"]);
  });
});

describe("getCcRecords", () => {
  it("returns every tied national record holder", async () => {
    const records = await getCcRecords({ state: "", event: "fto" });
    expect(
      records.map((record) => [
        record.type,
        record.competitors[0]?.name,
        record.value,
      ]),
    ).toEqual([
      ["single", "Ana", 2800],
      ["single", "Beto", 2800],
      ["average", "Beto", 3400],
    ]);
  });

  it("returns state records", async () => {
    const records = await getCcRecords({ state: "Jalisco", event: "" });
    expect(
      records.map((record) => [record.eventId, record.type, record.value]),
    ).toEqual([
      ["fto", "single", 2800],
      ["fto", "average", 3500],
      ["333_team_bld", "single", 5000],
    ]);
  });
});

describe("competition queries", () => {
  it("lists the competition's unofficial events", async () => {
    const events = await getCompetitionCcEvents("Comp2024");
    expect(events.map((event) => event.id)).toEqual(["fto", "333_team_bld"]);
  });

  it("returns every competitor's results in position order", async () => {
    const rows = await getCompetitionCcResults("Comp2024", "fto");
    expect(rows.map((row) => [row.position, row.competitors[0]?.name])).toEqual(
      [
        [1, "François"],
        [2, "Ana"],
        [3, "Beto"],
      ],
    );
  });
});

describe("person queries", () => {
  it("detects whether a person has unofficial results", async () => {
    expect(await hasPersonUnofficialResults("2020AAAA01")).toBe(true);
    expect(await hasPersonUnofficialResults("2020ZZZZ01")).toBe(false);
  });

  it("groups a person's results by event, newest first", async () => {
    const groups = await getPersonUnofficialResults("2020AAAA01");
    expect(
      groups.map((group) => [
        group.eventId,
        group.results.map((row) => row.resultId),
      ]),
    ).toEqual([
      ["fto", [2, 1]],
      ["333_team_bld", [10, 12, 11]],
    ]);
  });
});
