import { describe, expect, it } from "vitest";
import { insertPerson } from "@/test/factories";
import { getPersonsWithoutState } from "./queries";

describe("getPersonsWithoutState", () => {
  it("matches names accent-insensitively and only returns people without a state", async () => {
    await insertPerson({
      wcaId: "2019PERE01",
      name: "José Pérez",
      stateId: null,
    });
    await insertPerson({
      wcaId: "2019PERE02",
      name: "Jose Perez Ruiz",
      stateId: null,
    });
    await insertPerson({
      wcaId: "2019PERE03",
      name: "José Pérez Gil",
      stateId: "JAL",
    });
    await insertPerson({
      wcaId: "2019LOPE01",
      name: "Luis López",
      stateId: null,
    });

    const rows = await getPersonsWithoutState({ search: "jose perez" });

    // Order by name depends on the database collation, so compare as a set.
    expect(rows.map((r) => r.id).sort()).toEqual(["2019PERE01", "2019PERE02"]);
  });

  it("matches by WCA ID and caps results at five", async () => {
    for (let i = 1; i <= 7; i++) {
      await insertPerson({
        wcaId: `2021ABCD0${i}`,
        name: `Person ${i}`,
        stateId: null,
      });
    }

    const rows = await getPersonsWithoutState({ search: "2021abcd" });

    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ id: "2021ABCD01", name: "Person 1" });
  });
});
