import { describe, expect, it } from "vitest";
import { buildParticipantResults } from "./participation-data";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import type { Result } from "@/types/wcif";

function result(
  personId: number,
  ranking: number | null,
  best: number,
  average: number,
): Result {
  return { personId, ranking, attempts: [], best, average };
}

describe("buildParticipantResults", () => {
  it("shows averages for Ao5 rounds and singles for best-of rounds", () => {
    const wcif = makePrintablesWcif();
    const [cube, blind] = wcif.events;
    cube!.rounds[0]!.results = [
      result(1, 2, 950, 1000),
      result(2, 1, 850, 0),
      result(3, 3, 1000, -1),
      result(4, 4, 1100, 1200),
    ];
    blind!.rounds[0]!.results = [result(1, 1, 3000, -1), result(3, 2, -1, -1)];

    const participants = buildParticipantResults(wcif);

    expect(
      Object.fromEntries(participants.map((p) => [p.name, p.results])),
    ).toEqual({
      "Ana López": [
        { event: "333bf", ranking: 1, average: 3000 },
        { event: "333", ranking: 2, average: 1000 },
      ],
      "Beto Martínez (贝托)": [{ event: "333", ranking: 1, average: 850 }],
      "Carla Núñez": [
        { event: "333bf", ranking: 2, average: -1 },
        { event: "333", ranking: 3, average: -1 },
      ],
      "Diego Ramírez": [{ event: "333", ranking: 4, average: 1200 }],
    });
  });

  it("leaves out competitors with unranked results", () => {
    const wcif = makePrintablesWcif();
    wcif.events[0]!.rounds[0]!.results = [
      result(1, 1, 950, 1000),
      result(2, null, 850, 900),
    ];

    expect(buildParticipantResults(wcif).map((p) => p.name)).toEqual([
      "Ana López",
    ]);
  });
});
