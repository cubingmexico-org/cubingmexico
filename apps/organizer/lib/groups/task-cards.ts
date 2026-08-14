import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { WCIF } from "@/types/wcif";
import {
  buildAssignmentsByGroup,
  buildPersonTimeline,
  codeLabel,
  personsWithAssignments,
} from "@/lib/groups/day-of";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import { parseRoundActivityCode } from "@/lib/groups/wcif-schedule";

function formatTime(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildGroupSheetsDocument(
  wcif: WCIF,
  roundActivityCode: string,
): TDocumentDefinitions {
  const rows = buildAssignmentsByGroup(wcif, roundActivityCode);
  if (rows.length === 0) {
    throw new Error("No hay asignaciones para generar hojas de grupo.");
  }

  const parsed = parseRoundActivityCode(roundActivityCode);
  const roundTitle = parsed
    ? `${parsed.eventId} — Ronda ${parsed.roundNumber}`
    : roundActivityCode;

  const byGroup = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.orphan) continue;
    const key = `${row.roomId}|${row.groupNumber ?? "?"}|${row.roomName}`;
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  const groups = [...byGroup.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es"),
  );

  const content: Content[] = [];
  groups.forEach(([key, items], index) => {
    const [, groupNum, roomName] = key.split("|");
    const competitors = items.filter((i) => i.assignmentCode === "competitor");
    const staff = items.filter((i) => i.assignmentCode !== "competitor");

    content.push({
      stack: [
        { text: wcif.name, fontSize: 9, color: "#555" },
        {
          text: `Hoja de grupo — ${roundTitle}`,
          fontSize: 13,
          bold: true,
          margin: [0, 2, 0, 2],
        },
        {
          text: `Grupo ${groupNum} · ${roomName}`,
          fontSize: 11,
          margin: [0, 0, 0, 8],
        },
        { text: "Competidores", style: "section" },
        {
          table: {
            headerRows: 1,
            widths: [30, "*", 70, 40],
            body: [
              [
                { text: "Est.", style: "th" },
                { text: "Nombre", style: "th" },
                { text: "WCA ID", style: "th" },
                { text: "Firma", style: "th" },
              ],
              ...competitors
                .slice()
                .sort(
                  (a, b) =>
                    (a.stationNumber ?? 999) - (b.stationNumber ?? 999) ||
                    a.personName.localeCompare(b.personName, "es"),
                )
                .map((c) => [
                  String(c.stationNumber ?? ""),
                  c.personName,
                  c.wcaId ?? "",
                  "",
                ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10],
        },
        { text: "Voluntarios", style: "section" },
        staff.length === 0
          ? { text: "—", fontSize: 9, color: "#888" }
          : {
              ul: staff.map(
                (s) => `${s.personName} — ${codeLabel(s.assignmentCode)}`,
              ),
              fontSize: 9,
            },
      ],
      ...(index < groups.length - 1 ? { pageBreak: "after" as const } : {}),
    });
  });

  return {
    info: {
      title: `Hojas de grupo — ${roundTitle}`,
      author: "Cubing México",
    },
    content,
    pageSize: "LETTER",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: {
      section: { fontSize: 10, bold: true, margin: [0, 4, 0, 4] },
      th: { bold: true, fontSize: 8 },
    },
    language: "es",
  };
}

export function buildTaskCardsDocument(wcif: WCIF): TDocumentDefinitions {
  const people = personsWithAssignments(wcif);
  if (people.length === 0) {
    throw new Error(
      "No hay personas con asignaciones para tarjetas de tareas.",
    );
  }

  const content: Content[] = [];
  people.forEach((person, index) => {
    const timeline = buildPersonTimeline(wcif, person.wcaUserId);
    content.push({
      stack: [
        { text: wcif.name, fontSize: 8, color: "#555" },
        {
          text: "Tarjeta de tareas",
          fontSize: 11,
          bold: true,
          margin: [0, 2, 0, 2],
        },
        { text: person.name, fontSize: 13, bold: true },
        {
          text: person.wcaId ?? `ID ${person.registrantId ?? "—"}`,
          fontSize: 9,
          margin: [0, 0, 0, 6],
        },
        {
          table: {
            headerRows: 1,
            widths: [70, "*", 50, 40, 45],
            body: [
              [
                { text: "Hora", style: "th" },
                { text: "Actividad", style: "th" },
                { text: "Sala", style: "th" },
                { text: "Rol", style: "th" },
                { text: "Est.", style: "th" },
              ],
              ...timeline.map((row) => [
                formatTime(row.startTime),
                `${row.activityName}${row.groupNumber != null ? ` (G${row.groupNumber})` : ""}`,
                row.roomName,
                codeLabel(row.assignmentCode),
                row.stationNumber != null ? String(row.stationNumber) : "—",
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      ...(index < people.length - 1 ? { pageBreak: "after" as const } : {}),
    });
  });

  return {
    info: {
      title: `Tarjetas de tareas — ${wcif.name}`,
      author: "Cubing México",
    },
    content,
    pageSize: "LETTER",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: {
      th: { bold: true, fontSize: 8 },
    },
    language: "es",
  };
}

export function printGroupSheets(
  wcif: WCIF,
  roundActivityCode: string,
  action: PrintAction,
): void {
  const doc = buildGroupSheetsDocument(wcif, roundActivityCode);
  createGroupsPdf(doc, action, `${wcif.id}-${roundActivityCode}-group-sheets`);
}

export function buildAllGroupSheetsDocument(wcif: WCIF): TDocumentDefinitions {
  const content: Content[] = [];
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      try {
        const doc = buildGroupSheetsDocument(wcif, round.id);
        const roundContent = doc.content;
        if (Array.isArray(roundContent)) {
          content.push(...roundContent);
        } else if (roundContent) {
          content.push(roundContent);
        }
      } catch {
        // Skip rounds without assignments.
      }
    }
  }
  if (content.length === 0) {
    throw new Error("No hay asignaciones para generar hojas de grupo.");
  }
  return {
    info: {
      title: `Hojas de grupo — ${wcif.name}`,
      author: "Cubing México",
    },
    content,
    pageSize: "LETTER",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: {
      section: { bold: true, fontSize: 10, margin: [0, 6, 0, 4] },
      th: { bold: true, fontSize: 8 },
    },
    language: "es",
  };
}

export function printAllGroupSheets(wcif: WCIF, action: PrintAction): void {
  const doc = buildAllGroupSheetsDocument(wcif);
  createGroupsPdf(doc, action, `${wcif.id}-group-sheets-all`);
}

export function printTaskCards(wcif: WCIF, action: PrintAction): void {
  const doc = buildTaskCardsDocument(wcif);
  createGroupsPdf(doc, action, `${wcif.id}-task-cards`);
}
