import { describe, expect, it } from "vitest";
import {
  birthdatesFromAuthorizedWcif,
  emailsFromAuthorizedWcif,
} from "./authorized-person-fields";
import { makePrintablesWcif } from "@/test/wcif-fixture";

describe("birthdatesFromAuthorizedWcif", () => {
  it("maps valid registrant birthdates and skips bad rows", () => {
    const wcif = makePrintablesWcif();
    wcif.persons[0]!.birthdate = "2010-01-01";
    wcif.persons[1]!.birthdate = "not-a-date";
    wcif.persons[2]!.birthdate = "2012-05-20";
    wcif.persons[2]!.registrantId = null;

    expect(
      Object.fromEntries(birthdatesFromAuthorizedWcif(wcif).entries()),
    ).toEqual({ 1: "2010-01-01" });
  });
});

describe("emailsFromAuthorizedWcif", () => {
  it("maps non-empty emails by registrant id", () => {
    const wcif = makePrintablesWcif();
    wcif.persons[0]!.email = " ana@example.com ";
    wcif.persons[1]!.email = "";
    wcif.persons[2]!.email = "carla@example.com";

    expect(
      Object.fromEntries(
        [...emailsFromAuthorizedWcif(wcif).entries()].map(([id, info]) => [
          id,
          info.email,
        ]),
      ),
    ).toEqual({
      1: "ana@example.com",
      3: "carla@example.com",
    });
  });
});
