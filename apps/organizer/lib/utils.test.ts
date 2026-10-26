import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDates,
  formatPlace,
  formatResults,
  formatResultType,
  joinPersons,
  transformString,
} from "./utils";

describe("formatResults", () => {
  it("formats DNF and DNS", () => {
    expect(formatResults(-1, "333")).toBe("DNF");
    expect(formatResults(-2, "333")).toBe("DNS");
  });

  it("formats times under a minute", () => {
    expect(formatResults(1234, "333")).toBe("12.34");
    expect(formatResults(500, "222")).toBe("5.00");
  });

  it("formats times over a minute with zero-padded seconds", () => {
    expect(formatResults(6500, "444")).toBe("1:05.00");
    expect(formatResults(12345, "555")).toBe("2:03.45");
  });

  it("formats multi-blind as solved/attempted and time", () => {
    // 0DDTTTTTMM: DD=97 (2 points), 3600 s, 1 missed -> 3/4
    expect(formatResults(970360001, "333mbf")).toBe("3/4 en 60:00");
    // DD=90 (9 points), 3545 s, 0 missed -> 9/9
    expect(formatResults(900354500, "333mbf")).toBe("9/9 en 59:05");
  });
});

describe("formatPlace", () => {
  it("formats every place type", () => {
    expect(formatPlace(1, "cardinal")).toBe("1");
    expect(formatPlace(2, "ordinal")).toBe("2do");
    expect(formatPlace(3, "ordinal")).toBe("3er");
    expect(formatPlace(1, "ordinal_text")).toBe("Primer");
    expect(formatPlace(2, "medal")).toBe("Plata");
    expect(formatPlace(3, "medal")).toBe("Bronce");
    expect(formatPlace(7, "other")).toBe("7");
  });

  it("falls back to the number after the podium", () => {
    expect(formatPlace(4, "ordinal")).toBe("4");
    expect(formatPlace(4, "medal")).toBe("4");
  });
});

describe("formatResultType", () => {
  it("uses the best single for blindfolded events", () => {
    expect(formatResultType("333bf")).toBe("un mejor tiempo");
    expect(formatResultType("555bf")).toBe("un mejor tiempo");
  });

  it("uses the best result for FMC and multi-blind", () => {
    expect(formatResultType("333fm")).toBe("un mejor resultado");
    expect(formatResultType("333mbf")).toBe("un mejor resultado");
  });

  it("uses a mean for 6x6 and 7x7 and an average otherwise", () => {
    expect(formatResultType("666")).toBe("una media");
    expect(formatResultType("777")).toBe("una media");
    expect(formatResultType("333")).toBe("un promedio");
  });
});

describe("formatDates", () => {
  it("formats a single day", () => {
    const day = new Date(2025, 2, 15);
    expect(formatDates(day, day)).toBe(
      day.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      }),
    );
  });

  it("joins two days in the same month with y", () => {
    expect(formatDates(new Date(2025, 2, 15), new Date(2025, 2, 16))).toBe(
      "15 y 16 de marzo de 2025",
    );
  });

  it("lists three days in the same month", () => {
    expect(formatDates(new Date(2025, 4, 1), new Date(2025, 4, 3))).toBe(
      "1, 2 y 3 de mayo de 2025",
    );
  });

  it("formats a range across two months", () => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "2-digit",
    };
    const start = new Date(2025, 2, 31);
    const end = new Date(2025, 3, 1);
    expect(formatDates(start, end)).toBe(
      `${start.toLocaleDateString("es-ES", options)} - ${end.toLocaleDateString("es-ES", options)}`,
    );
  });
});

describe("joinPersons", () => {
  it("returns a single name unchanged", () => {
    expect(joinPersons(["Ana"])).toBe("Ana");
  });

  it("joins the last name with y", () => {
    expect(joinPersons(["Ana", "Beto", "Carla"])).toBe("Ana, Beto y Carla");
  });

  it("uses e before a name starting with I", () => {
    expect(joinPersons(["Ana", "Iván"])).toBe("Ana e Iván");
  });

  it("does not mutate the input", () => {
    const persons = ["Ana", "Beto"];
    joinPersons(persons);
    expect(persons).toEqual(["Ana", "Beto"]);
  });
});

describe("transformString", () => {
  it("applies each case type", () => {
    expect(transformString("hola mundo", "uppercase")).toBe("HOLA MUNDO");
    expect(transformString("HOLA", "lowercase")).toBe("hola");
    expect(transformString("hola mundo", "capitalize")).toBe("Hola Mundo");
    expect(transformString("Hola", "none")).toBe("Hola");
    expect(transformString("Hola")).toBe("Hola");
  });
});

describe("formatBytes", () => {
  it("formats zero and binary units", () => {
    expect(formatBytes(0)).toBe("0 Byte");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536, { decimals: 1 })).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024, { sizeType: "accurate" })).toBe("1 MiB");
  });
});
