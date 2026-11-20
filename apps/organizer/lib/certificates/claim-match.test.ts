import { describe, expect, it } from "vitest";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import { findPersonForClaim } from "./claim-match";

describe("findPersonForClaim", () => {
  it("matches by wcaId", () => {
    const wcif = makePrintablesWcif();
    const person = findPersonForClaim(wcif, "2015LOPE01");
    expect(person?.name).toBe("Ana López");
  });

  it("matches newcomers by wcaUserId", () => {
    const wcif = makePrintablesWcif();
    const newcomer = wcif.persons.find((p) => p.wcaId === null);
    expect(newcomer).toBeDefined();
    const person = findPersonForClaim(wcif, String(newcomer!.wcaUserId));
    expect(person?.registrantId).toBe(newcomer!.registrantId);
  });

  it("ignores unregistered persons", () => {
    const wcif = makePrintablesWcif();
    wcif.persons.push({
      name: "Staff Only",
      wcaUserId: 9999,
      wcaId: "2010STAFF01",
      registrantId: null,
      countryIso2: "MX",
      gender: null,
      registration: null,
      avatar: null,
      roles: ["staff-other"],
      assignments: [],
      personalBests: [],
      extensions: [],
    });
    expect(findPersonForClaim(wcif, "2010STAFF01")).toBeUndefined();
  });
});
