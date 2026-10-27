import { describe, expect, it } from "vitest";
import type { ExtendedPerson } from "@/types/wcif";
import { filterPersons, groupPersons } from "./group-persons";

function person(
  name: string,
  values: Partial<ExtendedPerson> = {},
): ExtendedPerson {
  return {
    name,
    wcaUserId: name.length,
    wcaId: `2020${name.toUpperCase().padEnd(4, "X").slice(0, 4)}01`,
    registrantId: name.length,
    countryIso2: "MX",
    gender: null,
    registration: null,
    avatar: null,
    roles: [],
    assignments: [],
    personalBests: [],
    extensions: [],
    stateId: null,
    ...values,
  };
}

describe("filterPersons", () => {
  const persons = [
    person("Óscar", {
      registration: {
        wcaRegistrationId: 1,
        eventIds: [],
        status: "accepted",
        isCompeting: true,
      },
    }),
    person("Ana"),
  ];

  it("matches names without accents and sorts by name", () => {
    expect(filterPersons(persons, "", false).map((p) => p.name)).toEqual([
      "Ana",
      "Óscar",
    ]);
    expect(filterPersons(persons, "osc", false).map((p) => p.name)).toEqual([
      "Óscar",
    ]);
  });

  it("can keep only competitors", () => {
    expect(filterPersons(persons, "", true).map((p) => p.name)).toEqual([
      "Óscar",
    ]);
  });
});

describe("groupPersons", () => {
  it("puts each person in their highest-priority group", () => {
    const groups = groupPersons([
      person("Dele", { roles: ["delegate", "organizer"] }),
      person("Orga", { roles: ["organizer", "staff-judge"] }),
      person("Volu", { roles: ["staff-judge"] }),
      person("Nuev", { wcaId: null }),
      person("Comp"),
    ]);

    expect(
      Object.fromEntries(groups.map((g) => [g.key, g.list.map((p) => p.name)])),
    ).toEqual({
      delegates: ["Dele"],
      organizers: ["Orga"],
      volunteers: ["Volu"],
      newcomers: ["Nuev"],
      regulars: ["Comp"],
    });
  });
});
