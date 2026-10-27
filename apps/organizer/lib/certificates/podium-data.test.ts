import { describe, expect, it } from "vitest";
import { buildPodiums, calculateAge } from "./podium-data";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import type { Result, WCIF } from "@/types/wcif";

function result(
  personId: number,
  best: number,
  average: number,
  ranking: number | null = personId,
): Result {
  return { personId, ranking, attempts: [], best, average };
}

function wcifWithResults(): WCIF {
  const wcif = makePrintablesWcif();
  const [cube, blind] = wcif.events;
  cube!.rounds[0]!.results = [
    result(1, 950, 1000),
    result(2, 850, 900),
    result(3, 1000, 1100),
    result(4, 1100, -1),
  ];
  blind!.rounds[0]!.results = [result(1, 3000, -1), result(3, 2500, 2800)];
  wcif.persons[1]!.gender = "f";
  wcif.persons[2]!.gender = "f";
  wcif.persons[2]!.countryIso2 = "US";
  return wcif;
}

const summary = (podiums: ReturnType<typeof buildPodiums>) =>
  podiums.map((p) => `${p.event} ${p.place} ${p.name} ${p.result}`);

describe("buildPodiums", () => {
  it("ranks Ao5 finals by average and best-of finals by single", () => {
    expect(summary(buildPodiums(wcifWithResults(), {}))).toEqual([
      "333 1 Beto Martínez (贝托) 900",
      "333 2 Ana López 1000",
      "333 3 Carla Núñez 1100",
      "333bf 1 Carla Núñez 2500",
      "333bf 2 Ana López 3000",
    ]);
  });

  it("ranks a best-of FMC final by single even though it has no average", () => {
    const wcif = makePrintablesWcif();
    wcif.events.push({
      id: "333fm",
      rounds: [
        {
          ...wcif.events[0]!.rounds[0]!,
          id: "333fm-r1",
          format: "1",
          results: [result(1, 30, 0), result(2, 25, 0), result(3, 28, 0)],
        },
      ],
      extensions: [],
      qualification: null,
    });

    expect(
      summary(buildPodiums(wcif, {})).filter((p) => p.startsWith("333fm")),
    ).toEqual([
      "333fm 1 Beto Martínez (贝托) 25",
      "333fm 2 Carla Núñez 28",
      "333fm 3 Ana López 30",
    ]);
  });

  it("skips events whose final still has unranked results", () => {
    const wcif = wcifWithResults();
    wcif.events[1]!.rounds[0]!.results.push(result(2, 4000, -1, null));
    expect(buildPodiums(wcif, {}).some((p) => p.event === "333bf")).toBe(false);
  });

  it("re-ranks within the filtered competitors", () => {
    expect(
      summary(buildPodiums(wcifWithResults(), { gender: "f", country: "MX" })),
    ).toEqual(["333 1 Beto Martínez (贝托) 900"]);

    expect(
      summary(buildPodiums(wcifWithResults(), { newcomer: true })),
    ).toEqual([]);
  });

  it("filters by age at the reference date", () => {
    const podiums = buildPodiums(wcifWithResults(), {
      age: {
        min: 0,
        max: 15,
        referenceDate: new Date(2025, 2, 15),
        birthdates: new Map([
          [1, "2010-03-15"],
          [2, "2009-03-16"],
          [3, "2009-03-15"],
        ]),
      },
    });

    // Beto turns 16 the day after; Carla turned 16 that day.
    expect(summary(podiums)).toEqual([
      "333 1 Beto Martínez (贝托) 900",
      "333 2 Ana López 1000",
      "333bf 1 Ana López 3000",
    ]);
  });
});

describe("calculateAge", () => {
  it("counts the birthday itself as a full year", () => {
    const reference = new Date(2025, 2, 15);
    expect(calculateAge("2010-03-15", reference)).toBe(15);
    expect(calculateAge("2010-03-16", reference)).toBe(14);
  });
});
