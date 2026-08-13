import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { WCIF } from "@/types/wcif";
import { getFormatInfo } from "@/lib/groups/formats";
import {
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";

const EVENT_NAMES: Record<string, string> = {
  "333": "3x3x3",
  "222": "2x2x2",
  "444": "4x4x4",
  "555": "5x5x5",
  "666": "6x6x6",
  "777": "7x7x7",
  "333bf": "3x3x3 BLD",
  "333fm": "3x3x3 FMC",
  "333oh": "3x3x3 OH",
  "333ft": "3x3x3 FT",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4x4 BLD",
  "555bf": "5x5x5 BLD",
  "333mbf": "3x3x3 MBLD",
};

export type ScorecardMode = "assigned" | "blank";

export type ScorecardPerson = {
  name: string;
  wcaId: string | null;
  groupNumber: number | null;
  stationNumber: number | null;
  roomName: string;
};

function roundLabel(roundActivityCode: string): string {
  const parsed = parseRoundActivityCode(roundActivityCode);
  if (!parsed) return roundActivityCode;
  const eventName = EVENT_NAMES[parsed.eventId] ?? parsed.eventId;
  return `${eventName} — Ronda ${parsed.roundNumber}`;
}

function buildScorecardBlock(
  competitionName: string,
  roundTitle: string,
  formatInfo: ReturnType<typeof getFormatInfo>,
  person: ScorecardPerson | null,
): Content {
  const headerCols = [
    ...formatInfo.attemptLabels.map((label) => ({
      text: label,
      style: "th",
      alignment: "center" as const,
    })),
    ...formatInfo.extraLabels.map((label) => ({
      text: label,
      style: "th",
      alignment: "center" as const,
    })),
  ];

  const emptyCols = headerCols.map(() => ({
    text: "",
    margin: [0, 14, 0, 14] as [number, number, number, number],
  }));

  return {
    stack: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: competitionName, style: "compName" },
              { text: roundTitle, style: "roundName" },
            ],
          },
          {
            width: "auto",
            stack: [
              {
                text: person
                  ? `G${person.groupNumber ?? "—"} · E${person.stationNumber ?? "—"}`
                  : "G___ · E___",
                style: "meta",
                alignment: "right",
              },
              {
                text: person?.roomName || "Sala: ________",
                style: "metaSmall",
                alignment: "right",
              },
            ],
          },
        ],
      },
      {
        margin: [0, 4, 0, 2],
        columns: [
          {
            width: "*",
            text: [
              { text: "Nombre: ", bold: true, fontSize: 8 },
              {
                text: person?.name || "_______________________________",
                fontSize: 9,
              },
            ],
          },
          {
            width: "auto",
            text: [
              { text: "WCA ID: ", bold: true, fontSize: 8 },
              {
                text: person?.wcaId || "______________",
                fontSize: 9,
              },
            ],
          },
        ],
      },
      {
        table: {
          widths: headerCols.map(() => "*"),
          body: [headerCols, emptyCols],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
      {
        margin: [0, 4, 0, 0],
        columns: [
          { text: "Juez: _______________", fontSize: 7 },
          { text: "Comp.: _______________", fontSize: 7, alignment: "right" },
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

export function collectAssignedScorecards(
  wcif: WCIF,
  roundActivityCode: string,
): ScorecardPerson[] {
  const groups = getGroupActivitiesForRound(wcif, roundActivityCode);
  if (groups.length === 0) {
    throw new Error(
      "Crea grupos y asignaciones antes de imprimir scorecards de esta ronda.",
    );
  }
  const groupIds = new Set(groups.map((g) => g.activity.id));
  const rows: ScorecardPerson[] = [];

  for (const person of wcif.persons) {
    for (const assignment of person.assignments ?? []) {
      if (
        assignment.assignmentCode !== "competitor" ||
        !groupIds.has(assignment.activityId)
      ) {
        continue;
      }
      const located = findActivityById(wcif, assignment.activityId);
      rows.push({
        name: person.name,
        wcaId: person.wcaId,
        groupNumber: located
          ? parseGroupNumber(located.activity.activityCode)
          : null,
        stationNumber: assignment.stationNumber,
        roomName: located?.roomName ?? "",
      });
    }
  }

  return rows.sort((a, b) => {
    const g = (a.groupNumber ?? 999) - (b.groupNumber ?? 999);
    if (g !== 0) return g;
    const s = (a.stationNumber ?? 999) - (b.stationNumber ?? 999);
    if (s !== 0) return s;
    return a.name.localeCompare(b.name, "es");
  });
}

export function defaultBlankCount(
  wcif: WCIF,
  roundActivityCode: string,
): number {
  const parsed = parseRoundActivityCode(roundActivityCode);
  if (!parsed) return 16;
  if (parsed.roundNumber <= 1) {
    try {
      return Math.max(collectAssignedScorecards(wcif, roundActivityCode).length, 8);
    } catch {
      return 16;
    }
  }
  const prevCode = `${parsed.eventId}-r${parsed.roundNumber - 1}`;
  try {
    return Math.max(collectAssignedScorecards(wcif, prevCode).length, 8);
  } catch {
    const eventId = parsed.eventId;
    const competing = wcif.persons.filter(
      (p) =>
        p.registration?.isCompeting &&
        (p.registration.eventIds ?? []).includes(eventId as never),
    ).length;
    return Math.max(Math.ceil(competing / 2), 8);
  }
}

export function buildScorecardsDocument(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
): TDocumentDefinitions {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const eventId = parsed?.eventId;
  const round = wcif.events
    .find((e) => e.id === eventId)
    ?.rounds.find((r) => r.id === roundActivityCode);
  const formatInfo = getFormatInfo(round?.format ?? "a", eventId);
  const title = roundLabel(roundActivityCode);

  let people: (ScorecardPerson | null)[];
  if (mode === "assigned") {
    people = collectAssignedScorecards(wcif, roundActivityCode);
    if (people.length === 0) {
      throw new Error("No hay asignaciones de competidor en esta ronda.");
    }
  } else {
    const n = Math.max(1, Math.min(blankCount, 500));
    people = Array.from({ length: n }, () => null);
  }

  // Pack ~4 cards per page
  const content: Content[] = [];
  for (let i = 0; i < people.length; i++) {
    content.push(
      buildScorecardBlock(wcif.name, title, formatInfo, people[i] ?? null),
    );
    if ((i + 1) % 4 === 0 && i < people.length - 1) {
      content.push({ text: "", pageBreak: "after" });
    } else if (i < people.length - 1) {
      content.push({
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.4,
            dash: { length: 3 },
          },
        ],
        margin: [0, 2, 0, 6],
      });
    }
  }

  return {
    info: {
      title: `Scorecards — ${title}`,
      author: "Cubing México",
    },
    content,
    pageSize: "LETTER",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
    },
    styles: {
      compName: { fontSize: 8, color: "#444" },
      roundName: { fontSize: 11, bold: true, margin: [0, 1, 0, 0] },
      meta: { fontSize: 10, bold: true },
      metaSmall: { fontSize: 7, color: "#555" },
      th: { fontSize: 7, bold: true },
    },
    language: "es",
  };
}

export function printScorecards(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  action: PrintAction,
): void {
  const doc = buildScorecardsDocument(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
  );
  const suffix = mode === "blank" ? "blank" : "assigned";
  createGroupsPdf(
    doc,
    action,
    `${wcif.id}-${roundActivityCode}-scorecards-${suffix}`,
  );
}
