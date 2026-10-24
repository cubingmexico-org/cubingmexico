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
  getCcRecordHistory,
  getCcRecords,
} from "./queries";
import {
  getCompetitionCcEvents,
  getCompetitionCcPodiums,
  getCompetitionCcResults,
  getCompetitionCcResultsByPerson,
} from "../../competitions/[id]/results/unofficial/_lib/queries";
import {
  getPersonUnofficialHonors,
  getPersonUnofficialPodiumsByEvent,
  getPersonUnofficialPrs,
  getPersonUnofficialResults,
  hasPersonUnofficialResults,
} from "../../persons/[id]/_lib/unofficial";
import { getTeamUnofficialMedals } from "../../teams/[stateId]/_lib/unofficial";
import { getPersonYearUnofficial } from "../../summary/[year]/[wcaId]/_lib/unofficial";
import { getTeamYearUnofficial } from "../../summary/team/[year]/[stateId]/_lib/unofficial";

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

describe("competition podiums and per-person results", () => {
  it("returns the top three of each final, by event and position", async () => {
    const groups = await getCompetitionCcPodiums("Comp2024");
    expect(
      groups.map((group) => [
        group.eventId,
        group.results.map((row) => row.resultId),
      ]),
    ).toEqual([
      ["fto", [4, 2, 3]],
      ["333_team_bld", [12]],
    ]);
  });

  it("lists team results under every member with a profile", async () => {
    const byPerson = await getCompetitionCcResultsByPerson("Comp2024");
    expect(Object.keys(byPerson).sort()).toEqual(["2020AAAA01", "2020BBBB01"]);
    expect(byPerson["2020AAAA01"]?.map((row) => row.resultId)).toEqual([2, 12]);
    expect(byPerson["2020BBBB01"]?.map((row) => row.resultId)).toEqual([3, 12]);
  });
});

describe("getPersonUnofficialPrs", () => {
  it("returns bests with national ranks, using the best team for team events", async () => {
    const prs = await getPersonUnofficialPrs("2020AAAA01");
    expect(prs.map((pr) => [pr.eventId, pr.single, pr.average])).toEqual([
      [
        "fto",
        { value: 2800, countryRank: 1, stateRank: 1 },
        { value: 3500, countryRank: 2, stateRank: 1 },
      ],
      ["333_team_bld", { value: 5000, countryRank: 1, stateRank: 1 }, null],
    ]);
  });

  it("ranks within the person's state and has no USR without a state", async () => {
    await insertPerson({ wcaId: "2020DDDD01", name: "Dani", stateId: "JAL" });
    await insertCcPerson({ id: 5, name: "Dani", wcaId: "2020DDDD01" });
    await insertCcResult({
      id: 30,
      competitionId: "Comp2024",
      eventId: "fto",
      personIds: [5],
      pos: 4,
      best: 3200,
      date: new Date("2024-06-01T00:00:00Z"),
    });
    const [fto] = await getPersonUnofficialPrs("2020DDDD01");
    expect(fto?.single).toEqual({ value: 3200, countryRank: 4, stateRank: 2 });

    await insertPerson({ wcaId: "2020EEEE01", name: "Eli" });
    await insertCcPerson({ id: 6, name: "Eli", wcaId: "2020EEEE01" });
    await insertCcResult({
      id: 31,
      competitionId: "Comp2024",
      eventId: "fto",
      personIds: [6],
      pos: 5,
      best: 3300,
      date: new Date("2024-06-01T00:00:00Z"),
    });
    const [eliFto] = await getPersonUnofficialPrs("2020EEEE01");
    expect(eliFto?.single?.stateRank).toBeNull();
  });

  it("is empty for a person without unofficial results", async () => {
    await insertPerson({ wcaId: "2020ZZZZ01", name: "Zoe" });
    expect(await getPersonUnofficialPrs("2020ZZZZ01")).toEqual([]);
  });
});

describe("UNR/USR record markers", () => {
  it("marks national record progressions, including same-day ties", async () => {
    const comp2024 = await getCompetitionCcResults("Comp2024", "fto");
    expect(
      comp2024.map((row) => [
        row.resultId,
        row.singleRecord,
        row.averageRecord,
      ]),
    ).toEqual([
      [4, null, null],
      [2, "UNR", null],
      [3, "UNR", "UNR"],
    ]);
    const comp2023 = await getCompetitionCcResults("Comp2023", "fto");
    expect(comp2023[0]).toMatchObject({
      resultId: 1,
      singleRecord: "UNR",
      averageRecord: "UNR",
    });
    const euro = await getCompetitionCcResults("Euro2024", "fto");
    expect(euro[0]).toMatchObject({ resultId: 5, singleRecord: null });
  });

  it("marks a state's first result as USR when it isn't a UNR", async () => {
    await insertPerson({ wcaId: "2020DDDD01", name: "Dani", stateId: "PUE" });
    await insertCcPerson({ id: 5, name: "Dani", wcaId: "2020DDDD01" });
    await insertCcResult({
      id: 30,
      competitionId: "Comp2024",
      eventId: "fto",
      personIds: [5],
      pos: 4,
      best: 3200,
      date: new Date("2024-06-01T00:00:00Z"),
    });
    const rows = await getCompetitionCcResults("Comp2024", "fto");
    expect(rows.find((row) => row.resultId === 30)?.singleRecord).toBe("USR");

    const history = await getCcRecordHistory({ state: "Puebla", event: "" });
    expect(history.map((row) => [row.key, row.marker])).toEqual([
      ["30-single", "USR"],
    ]);
  });

  it("lists the national history newest first", async () => {
    const history = await getCcRecordHistory({ state: "", event: "fto" });
    expect(history.map((row) => [row.key, row.marker, row.value])).toEqual([
      ["3-average", "UNR", 3400],
      ["2-single", "UNR", 2800],
      ["3-single", "UNR", 2800],
      ["1-average", "UNR", 3500],
      ["1-single", "UNR", 3000],
    ]);
  });

  it("includes national records in a state's history", async () => {
    const history = await getCcRecordHistory({
      state: "Jalisco",
      event: "fto",
    });
    expect(history.map((row) => [row.key, row.marker])).toEqual([
      ["2-single", "UNR"],
      ["1-average", "UNR"],
      ["1-single", "UNR"],
    ]);
  });
});

describe("unofficial podiums and honors", () => {
  it("counts a person's medals and records", async () => {
    expect(await getPersonUnofficialHonors("2020AAAA01")).toEqual({
      medals: { gold: 4, silver: 1, bronze: 0 },
      records: { unr: 6, usr: 0 },
    });
  });

  it("groups a person's medals by event", async () => {
    expect(await getPersonUnofficialPodiumsByEvent("2020AAAA01")).toEqual([
      {
        eventId: "fto",
        eventName: "Face-Turning Octahedron",
        gold: 1,
        silver: 1,
        bronze: 0,
        total: 2,
      },
      {
        eventId: "333_team_bld",
        eventName: "3x3x3 Team-Blind",
        gold: 3,
        silver: 0,
        bronze: 0,
        total: 3,
      },
    ]);
  });

  it("counts a team's medals once per result", async () => {
    expect(await getTeamUnofficialMedals("CMX")).toEqual({
      gold: 2,
      silver: 0,
      bronze: 1,
      total: 3,
    });
  });
});

describe("year summaries", () => {
  it("summarizes a person's year, counting final podiums", async () => {
    expect(await getPersonYearUnofficial("2020AAAA01", 2024)).toEqual({
      resultCount: 3,
      competitionCount: 2,
      events: [
        { eventId: "fto", eventName: "Face-Turning Octahedron" },
        { eventId: "333_team_bld", eventName: "3x3x3 Team-Blind" },
      ],
      podiums: { gold: 2, silver: 1, bronze: 0 },
    });
    const previous = await getPersonYearUnofficial("2020AAAA01", 2023);
    expect(previous.resultCount).toBe(2);
    expect(previous.competitionCount).toBe(1);
  });

  it("summarizes a team's members", async () => {
    const summary = await getTeamYearUnofficial("CMX", 2024);
    expect(summary).toMatchObject({
      memberCount: 1,
      resultCount: 2,
      competitionCount: 1,
      podiums: { gold: 1, silver: 0, bronze: 1 },
    });
    expect((await getTeamYearUnofficial("CMX", 2022)).resultCount).toBe(0);
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
