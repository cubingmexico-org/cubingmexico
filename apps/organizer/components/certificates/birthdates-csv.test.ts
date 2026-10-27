import { describe, expect, it } from "vitest";
import { parseBirthdatesCsv } from "./birthdates-csv";

describe("parseBirthdatesCsv", () => {
  it("reads the WCA export columns", () => {
    const { birthdates, validCount } = parseBirthdatesCsv(
      "Registrant Id,Name,Birth Date\n1,Ana,2010-05-01\n2,Beto,2012-11-30\n",
    );

    expect(validCount).toBe(2);
    expect([...birthdates]).toEqual([
      [1, "2010-05-01"],
      [2, "2012-11-30"],
    ]);
  });

  it("accepts the alternative column names", () => {
    expect(
      parseBirthdatesCsv("registrant_id,birthdate\n7,2001-01-02").birthdates,
    ).toEqual(new Map([[7, "2001-01-02"]]));
    expect(
      parseBirthdatesCsv("registrantId,Birthdate\n8,2002-02-03").birthdates,
    ).toEqual(new Map([[8, "2002-02-03"]]));
  });

  it("skips rows with a missing id, a bad date or a non-numeric id", () => {
    const { birthdates, validCount } = parseBirthdatesCsv(
      [
        "Registrant Id,Birth Date",
        ",2010-05-01",
        "3,01/05/2010",
        "x,2010-05-01",
        "4,2010-05-01",
        "",
      ].join("\n"),
    );

    expect(validCount).toBe(1);
    expect(birthdates).toEqual(new Map([[4, "2010-05-01"]]));
  });

  it("finds nothing in a CSV without the expected columns", () => {
    expect(parseBirthdatesCsv("id,date\n1,2010-05-01").validCount).toBe(0);
  });
});
