import { describe, expect, it } from "vitest";
import type { WCIF } from "@/types/wcif";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import {
  buildAllGroupSheetsDocument,
  buildGroupSheetsDocument,
  buildTaskCardsDocument,
} from "./task-cards-document";

function withoutAssignments(wcif: WCIF): WCIF {
  return {
    ...wcif,
    persons: wcif.persons.map((p) => ({ ...p, assignments: [] })),
  };
}

describe("task cards", () => {
  it("prints one page per person with their timeline", () => {
    const doc = buildTaskCardsDocument(makePrintablesWcif());

    expect(Array.isArray(doc.content) && doc.content.length).toBe(4);
    expect(doc).toMatchSnapshot();
  });

  it("refuses to print without assignments", () => {
    expect(() =>
      buildTaskCardsDocument(withoutAssignments(makePrintablesWcif())),
    ).toThrow("No hay personas con asignaciones para tarjetas de tareas.");
  });
});

describe("group sheets", () => {
  it("prints one page per group of a round, with competitors and staff", () => {
    const doc = buildGroupSheetsDocument(makePrintablesWcif(), "333-r1");

    expect(Array.isArray(doc.content) && doc.content.length).toBe(2);
    expect(doc).toMatchSnapshot();
  });

  it("combines every round with assignments", () => {
    const doc = buildAllGroupSheetsDocument(makePrintablesWcif());

    expect(Array.isArray(doc.content) && doc.content.length).toBe(3);
  });

  it("refuses to print without assignments", () => {
    expect(() =>
      buildAllGroupSheetsDocument(withoutAssignments(makePrintablesWcif())),
    ).toThrow("No hay asignaciones para generar hojas de grupo.");
  });
});
