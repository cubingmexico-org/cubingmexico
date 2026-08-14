import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import QRCode from "qrcode";
import type { EventId, Person, Round, WCIF } from "@/types/wcif";
import {
  getCompetitionConfig,
  type CompetitionConfig,
  type ScorecardDensity,
  type ScorecardPaperSize,
} from "@/lib/groups/config";
import { resolveScorecardsBackgroundUrl } from "@/lib/groups/competition-image";
import { getFormatInfo, type FormatInfo } from "@/lib/groups/formats";
import {
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import { loadImageAsDataUrl } from "@/lib/groups/load-image-data-url";
import { formatResults } from "@/lib/utils";

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

const NO_SCRAMBLE_CHECKER = new Set(["555", "666", "777", "minx"]);

const PAPER_BASE = {
  a4: {
    pageWidth: 595.28,
    pageHeight: 841.89,
    perRow: 2,
    perPage: 4,
    hMargin: 14,
    vMargin: 12,
  },
  letter: {
    pageWidth: 612,
    pageHeight: 792,
    perRow: 2,
    perPage: 4,
    hMargin: 14,
    vMargin: 10,
  },
  a6: {
    pageWidth: 297.64,
    pageHeight: 419.53,
    perRow: 1,
    perPage: 1,
    hMargin: 14,
    vMargin: 14,
  },
} as const;

type PaperLayout = {
  pageWidth: number;
  pageHeight: number;
  perRow: number;
  perPage: number;
  hMargin: number;
  vMargin: number;
};

function resolvePaperLayout(
  size: ScorecardPaperSize,
  density: ScorecardDensity,
): PaperLayout {
  const base = PAPER_BASE[size] ?? PAPER_BASE.letter;
  if (size === "a6" || density === "compact") {
    return { ...base };
  }
  // Comfortable: 2 full-width cards stacked on A4/Letter.
  return {
    pageWidth: base.pageWidth,
    pageHeight: base.pageHeight,
    perRow: 1,
    perPage: 2,
    hMargin: base.hMargin,
    vMargin: Math.max(base.vMargin, 12),
  };
}

/** Inner width of one scorecard cell in the page grid (between cut lines). */
function scorecardCellWidth(paper: PaperLayout): number {
  return (paper.pageWidth - paper.hMargin * (paper.perRow + 1)) / paper.perRow;
}

const noBorder = {
  border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
};

export type ScorecardMode = "assigned" | "blank";

export type ScorecardPerson = {
  name: string;
  localName: string | null;
  wcaId: string | null;
  registrantId: number | null;
  groupNumber: number | null;
  stationNumber: number | null;
  roomName: string;
  worldRankingSingle: number | null;
  worldRankingAverage: number | null;
  nationalRankingAverage: number | null;
  pbSingle: number | null;
  pbAverage: number | null;
};

type CardSlot =
  | { kind: "cover"; content: Content[] }
  | { kind: "scorecard"; content: Content[] }
  | { kind: "empty" };

type ScorecardLabels = {
  event: string;
  round: string;
  group: string;
  station: string;
  id: string;
  name: string;
  newcomer: string;
  scramble: string;
  check: string;
  result: string;
  judge: string;
  competitor: string;
  moves: string;
  solved: string;
  attempted: string;
  time: string;
  extra: string;
  packCount: (n: number) => string;
  forDelegate: string;
  forDataEntry: string;
  packed: (n: number) => string;
  missingSignatures: string;
  incidentCards: string;
  resultsEntered: string;
  incidentsLogged: string;
  resultsReviewed: string;
  initialsDelegate: string;
  initialsDataEntry: string;
};

function scorecardLabels(): ScorecardLabels {
  return {
    event: "Evento",
    round: "Ronda",
    group: "Grupo",
    station: "Est.",
    id: "ID",
    name: "Nombre",
    newcomer: "NUEVO",
    scramble: "Scr",
    check: "Chk",
    result: "Resultado",
    judge: "Juez",
    competitor: "Comp",
    moves: "Movimientos",
    solved: "Resueltos",
    attempted: "Intentados",
    time: "Tiempo",
    extra: "Extra (iniciales delegado _______)",
    packCount: (n) => `${n} papeletas`,
    forDelegate: "-------------------- PARA DELEGADO --------------------",
    forDataEntry: "-------------------- PARA CAPTURA --------------------",
    packed: (n) => `1. Empaquetadas las ${n} papeletas`,
    missingSignatures: "2. Revisadas firmas faltantes",
    incidentCards: "3. Papeletas con incidentes: ______",
    resultsEntered: "4. Resultados capturados por Capturista",
    incidentsLogged: "5. Incidentes registrados por Delegado",
    resultsReviewed: "6. Resultados revisados por Delegado",
    initialsDelegate: "Iniciales Delegado",
    initialsDataEntry: "Iniciales Capturista",
  };
}

function emptyCard(): CardSlot {
  return { kind: "empty" };
}

function cardCellContent(card: CardSlot): Content {
  if (card.kind === "empty") return { text: "" };
  return card.content as unknown as Content;
}

function scorecardBackgroundPositions(paper: PaperLayout, imageSize: number) {
  const cols = paper.perRow;
  const rows = paper.perPage / paper.perRow;
  const colWidth = scorecardCellWidth(paper);
  const contentHeight = paper.pageHeight - 2 * paper.vMargin;
  const rowGap = paper.vMargin;
  const rowHeight = (contentHeight - rowGap * Math.max(0, rows - 1)) / rows;
  const positions: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x:
          paper.hMargin +
          col * (colWidth + paper.hMargin) +
          (colWidth - imageSize) / 2,
        y:
          paper.vMargin +
          row * (rowHeight + rowGap) +
          (rowHeight - imageSize) / 2,
      });
    }
  }
  return positions;
}

function cutLines(paper: PaperLayout): Content {
  const color = "#888888";
  const lw = 0.5;
  const dash = { length: 8, space: 4 };
  const marks: Array<Record<string, unknown>> = [];

  if (paper.perPage === 4) {
    marks.push(
      {
        type: "line",
        x1: paper.hMargin,
        y1: paper.pageHeight / 2,
        x2: paper.pageWidth - paper.hMargin,
        y2: paper.pageHeight / 2,
        lineWidth: lw,
        dash,
        lineColor: color,
      },
      {
        type: "line",
        x1: paper.pageWidth / 2,
        y1: paper.vMargin,
        x2: paper.pageWidth / 2,
        y2: paper.pageHeight - paper.vMargin,
        lineWidth: lw,
        dash,
        lineColor: color,
      },
    );
  } else if (paper.perPage === 2) {
    marks.push({
      type: "line",
      x1: paper.hMargin,
      y1: paper.pageHeight / 2,
      x2: paper.pageWidth - paper.hMargin,
      y2: paper.pageHeight / 2,
      lineWidth: lw,
      dash,
      lineColor: color,
    });
  }

  if (marks.length === 0) return { text: "" };
  return { canvas: marks } as unknown as Content;
}

function parseLocalName(fullName: string): {
  latin: string;
  local: string | null;
} {
  const match = /^(.+?)\s*\((.+)\)$/.exec(fullName.trim());
  if (match?.[1] && match[2]) {
    return { latin: match[1].trim(), local: match[2].trim() };
  }
  return { latin: fullName, local: null };
}

function displayName(
  person: ScorecardPerson,
  config: CompetitionConfig,
): string {
  const parsed = parseLocalName(person.name);
  const local = person.localName ?? parsed.local;
  const latin = parsed.latin;
  if (!local) return latin;
  if (config.printOneName) {
    return config.localNamesFirst ? local : latin;
  }
  if (config.localNamesFirst) {
    return `${local} (${latin})`;
  }
  return `${latin} (${local})`;
}

function isTopRanked(person: ScorecardPerson): boolean {
  if (
    person.worldRankingSingle != null &&
    person.worldRankingSingle > 0 &&
    person.worldRankingSingle <= 50
  ) {
    return true;
  }
  if (
    person.worldRankingAverage != null &&
    person.worldRankingAverage > 0 &&
    person.worldRankingAverage <= 50
  ) {
    return true;
  }
  if (
    person.nationalRankingAverage != null &&
    person.nationalRankingAverage > 0 &&
    person.nationalRankingAverage <= 15
  ) {
    return true;
  }
  return false;
}

function shouldPrintScrambleChecker(
  eventId: string | undefined,
  roundActivityCode: string,
  wcif: WCIF,
  person: ScorecardPerson | null,
  mode: ScorecardMode,
  config: CompetitionConfig,
  formatInfo: FormatInfo,
): boolean {
  if (!eventId || NO_SCRAMBLE_CHECKER.has(eventId)) return false;
  if (formatInfo.isFmc || formatInfo.isMbld) return false;
  if (mode === "blank") {
    return config.printScrambleCheckerForBlankScorecards;
  }
  if (
    config.printScrambleCheckerForTopRankedCompetitors &&
    person &&
    isTopRanked(person)
  ) {
    return true;
  }
  if (config.printScrambleCheckerForFinalRounds) {
    const event = wcif.events.find((e) => e.id === eventId);
    const lastRound = event?.rounds[event.rounds.length - 1];
    if (lastRound?.id === roundActivityCode) return true;
  }
  return false;
}

function formatCentiseconds(cs: number): string {
  const totalSeconds = Math.floor(cs / 100);
  const centis = cs % 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  }
  return `${seconds}.${String(centis).padStart(2, "0")}`;
}

function formatPbValue(
  value: number | null,
  eventId: string | undefined,
): string | null {
  if (value == null || value <= 0) return null;
  if (!eventId) return formatCentiseconds(value);
  if (eventId === "333fm") {
    // FMC singles are move counts (integer); averages are move*100.
    if (Number.isInteger(value) && value < 100) return String(value);
    return (value / 100).toFixed(2);
  }
  try {
    return formatResults(value, eventId as EventId);
  } catch {
    return formatCentiseconds(value);
  }
}

function pbLineText(
  person: ScorecardPerson,
  eventId: string | undefined,
): string | null {
  const single = formatPbValue(person.pbSingle, eventId);
  const average = formatPbValue(person.pbAverage, eventId);
  if (!single && !average) return null;
  if (single && average) return `PB: ${single} / ${average}`;
  if (single) return `PB: ${single}`;
  return `PB avg: ${average}`;
}

function timeLimitText(round: Round | undefined): string | null {
  const tl = round?.timeLimit as
    | { centiseconds?: number; cumulativeRoundIds?: string[] }
    | null
    | undefined;
  if (!tl?.centiseconds || tl.centiseconds <= 0) return null;
  return `Límite: ${formatCentiseconds(tl.centiseconds)}`;
}

function cutoffText(
  round: Round | undefined,
  eventId: string | undefined,
): string | null {
  const cutoff = round?.cutoff as
    | { numberOfAttempts?: number; attemptResult?: number }
    | null
    | undefined;
  if (!cutoff?.attemptResult || cutoff.attemptResult <= 0) return null;
  const attempts = cutoff.numberOfAttempts ?? 2;
  if (eventId === "333fm") {
    return `Corte: ${cutoff.attemptResult} mov. (${attempts} int.)`;
  }
  return `Corte: ${formatCentiseconds(cutoff.attemptResult)} (${attempts} int.)`;
}

function labelCell(text: string, style: Record<string, unknown> = {}): Content {
  return {
    text,
    ...noBorder,
    fontSize: 9,
    ...style,
  } as Content;
}

type AttemptLayout = "timed" | "fmc" | "mbld";

function attemptLayoutOf(formatInfo: FormatInfo): AttemptLayout {
  if (formatInfo.isFmc) return "fmc";
  if (formatInfo.isMbld) return "mbld";
  return "timed";
}

function attemptColumnWidths(
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Array<number | string> {
  if (layout === "fmc") {
    return [16, "*", 25, 25];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [16, 40, 45, "*", 25, 25];
    }
    return [16, 30, "*", 25, 25];
  }
  // Groupifier timed widths
  return [16, 25, ...(printScrambleChecker ? [25] : []), "*", 25, 25];
}

function attemptHeaderRow(
  layout: AttemptLayout,
  labels: ScorecardLabels,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[] {
  if (layout === "fmc") {
    return [
      labelCell(""),
      labelCell(labels.moves, { alignment: "center" }),
      labelCell(labels.judge, { alignment: "center" }),
      labelCell(labels.competitor, { alignment: "center" }),
    ];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [
        labelCell(""),
        labelCell(labels.solved, { alignment: "center" }),
        labelCell(labels.attempted, { alignment: "center" }),
        labelCell(labels.time, { alignment: "center" }),
        labelCell(labels.judge, { alignment: "center" }),
        labelCell(labels.competitor, { alignment: "center" }),
      ];
    }
    return [
      labelCell(""),
      labelCell("R/I", { alignment: "center" }),
      labelCell(labels.time, { alignment: "center" }),
      labelCell(labels.judge, { alignment: "center" }),
      labelCell(labels.competitor, { alignment: "center" }),
    ];
  }
  return [
    labelCell(""),
    labelCell(labels.scramble, { alignment: "center" }),
    ...(printScrambleChecker
      ? [labelCell(labels.check, { alignment: "center" })]
      : []),
    labelCell(labels.result, { alignment: "center" }),
    labelCell(labels.judge, { alignment: "center" }),
    labelCell(labels.competitor, { alignment: "center" }),
  ];
}

function attemptRow(
  attemptNumber: number | string,
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[] {
  // Empty `{}` cells match Groupifier — `{ text: "" }` adds extra line box height
  // and can push the 2nd row of a page onto the next sheet.
  const num = {
    text: String(attemptNumber),
    ...noBorder,
    fontSize: 20,
    bold: true,
    alignment: "center",
  };
  if (layout === "fmc") {
    return [num, {}, {}, {}] as Content[];
  }
  if (layout === "mbld") {
    if (comfortable) {
      return [num, {}, {}, {}, {}, {}] as Content[];
    }
    return [num, {}, {}, {}, {}] as Content[];
  }
  return [
    num,
    {},
    ...(printScrambleChecker ? [{}] : []),
    {},
    {},
    {},
  ] as Content[];
}

function colSpanFor(
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): number {
  if (layout === "fmc") return 4;
  if (layout === "mbld") return comfortable ? 6 : 5;
  return 5 + (printScrambleChecker ? 1 : 0);
}

function attemptRows(
  attemptCount: number,
  cutoffAttempts: number | null,
  scorecardWidth: number,
  layout: AttemptLayout,
  printScrambleChecker: boolean,
  comfortable: boolean,
): Content[][] {
  const rows: Content[][] = [];
  const span = colSpanFor(layout, printScrambleChecker, comfortable);
  for (let i = 0; i < attemptCount; i++) {
    rows.push(attemptRow(i + 1, layout, printScrambleChecker, comfortable));
    if (i < attemptCount - 1) {
      const isCutoffLine = cutoffAttempts != null && i + 1 === cutoffAttempts;
      rows.push([
        {
          ...noBorder,
          colSpan: span,
          margin: [0, 1],
          columns: !isCutoffLine
            ? []
            : [
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 0,
                      x2: scorecardWidth,
                      y2: 0,
                      dash: { length: 5 },
                    },
                  ],
                },
              ],
        } as Content,
      ]);
    }
  }
  return rows;
}

function checkboxLine(label: string): Content {
  return {
    text: [{ text: `${label} ` }, "[ ]"],
    fontSize: 10,
    margin: [20, 4, 0, 4],
  };
}

function initialsField(label: string): Content {
  return {
    text: [{ text: label, bold: true }, " ______"],
    alignment: "center",
    fontSize: 10,
    margin: [0, 4, 0, 4],
  };
}

const fillInBorder = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 2,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

function blankLabelCell(text: string): Content {
  return {
    text,
    fontSize: 7,
    color: "#333333",
    border: [false, false, false, false],
    margin: [0, 3, 1, 0],
  } as Content;
}

function blankFieldCell(): Content {
  return {
    text: " ",
    border: [true, true, true, true],
    borderColor: ["#222222", "#222222", "#222222", "#222222"],
    margin: [1, 2, 1, 2],
  } as Content;
}

function blankNameRow(label: string, width: number): Content {
  return {
    table: {
      widths: [32, width - 32],
      body: [[blankLabelCell(`${label}:`), blankFieldCell()]],
    },
    layout: fillInBorder,
    margin: [0, 0, 0, 3],
  } as Content;
}

function blankMetaTable(
  labels: ScorecardLabels,
  width: number,
  printStations: boolean,
  margin: [number, number, number, number],
): Content {
  const fields: Array<{ label: string; boxWeight: number }> = [
    { label: `${labels.event}:`, boxWeight: 34 },
    { label: `${labels.round}:`, boxWeight: 12 },
    { label: `${labels.group}:`, boxWeight: 12 },
    { label: `${labels.id}:`, boxWeight: 18 },
  ];
  if (printStations) {
    fields.push({ label: `${labels.station}:`, boxWeight: 12 });
  }

  const labelColWidth = 11;
  const boxSpace = width - labelColWidth * fields.length;
  const boxWeightTotal = fields.reduce(
    (sum, field) => sum + field.boxWeight,
    0,
  );
  const widths: Array<number | string> = [];
  const row: Content[] = [];
  for (const field of fields) {
    widths.push(labelColWidth);
    row.push(blankLabelCell(field.label));
    widths.push((boxSpace * field.boxWeight) / boxWeightTotal);
    row.push(blankFieldCell());
  }

  return {
    table: { widths, body: [row] },
    layout: fillInBorder,
    margin,
  } as Content;
}

function buildCoverSheet(params: {
  competitionName: string;
  eventName: string;
  roundNumber: number;
  groupNumber: number;
  roomName: string;
  numberOfScorecards: number;
  labels: ScorecardLabels;
}): Content[] {
  const {
    competitionName,
    eventName,
    roundNumber,
    groupNumber,
    roomName,
    numberOfScorecards,
    labels,
  } = params;
  const m = [0, 3] as [number, number];

  return [
    {
      text: competitionName,
      bold: true,
      fontSize: 12,
      margin: m,
      alignment: "center",
      color: "#444444",
    },
    {
      text: `Grupo ${groupNumber}`,
      bold: true,
      fontSize: 22,
      margin: [0, 6, 0, 2],
      alignment: "center",
    },
    {
      text: labels.packCount(numberOfScorecards),
      fontSize: 14,
      margin: m,
      alignment: "center",
    },
    {
      text: `${eventName} · ${labels.round} ${roundNumber}`,
      fontSize: 12,
      margin: m,
      alignment: "center",
    },
    ...(roomName
      ? [
          {
            text: roomName,
            fontSize: 13,
            bold: true,
            margin: [0, 2, 0, 6] as [number, number, number, number],
            alignment: "center" as const,
          },
        ]
      : []),
    {
      text: labels.forDelegate,
      alignment: "center",
      margin: [0, 6, 0, 4],
      fontSize: 9,
    },
    checkboxLine(labels.packed(numberOfScorecards)),
    checkboxLine(labels.missingSignatures),
    {
      text: labels.incidentCards,
      fontSize: 10,
      margin: [20, 4, 0, 4],
    },
    initialsField(labels.initialsDelegate),
    {
      text: labels.forDataEntry,
      alignment: "center",
      margin: [0, 6, 0, 4],
      fontSize: 9,
    },
    checkboxLine(labels.resultsEntered),
    initialsField(labels.initialsDataEntry),
    checkboxLine(labels.incidentsLogged),
    initialsField(labels.initialsDelegate),
    checkboxLine(labels.resultsReviewed),
    initialsField(labels.initialsDelegate),
  ];
}

function buildScorecardContent(params: {
  scorecardNumber: number | null;
  competitionName: string;
  eventName: string | null;
  eventId: string | undefined;
  roundNumber: number | null;
  groupNumber: number | null;
  person: ScorecardPerson | null;
  config: CompetitionConfig;
  formatInfo: FormatInfo;
  cutoffAttempts: number | null;
  timeLimitLabel: string | null;
  cutoffLabel: string | null;
  printScrambleChecker: boolean;
  scorecardWidth: number;
  labels: ScorecardLabels;
  qrDataUrl: string | null;
  comfortable: boolean;
}): Content[] {
  const {
    scorecardNumber,
    competitionName,
    eventName,
    eventId,
    roundNumber,
    groupNumber,
    person,
    config,
    formatInfo,
    cutoffAttempts,
    timeLimitLabel,
    cutoffLabel,
    printScrambleChecker,
    scorecardWidth,
    labels,
    qrDataUrl,
    comfortable,
  } = params;

  const printStations = config.printStations;
  const isBlank = person == null;
  const nameText = person ? displayName(person, config) : " ";
  const isNewcomer =
    person?.name && person.registrantId != null && !person.wcaId;
  const layout = attemptLayoutOf(formatInfo);
  const pbText =
    config.printPersonalBests && person ? pbLineText(person, eventId) : null;

  const stationBlock: Content | null =
    printStations && !isBlank && person?.stationNumber != null
      ? ({
          stack: [
            {
              text: labels.station,
              fontSize: 7,
              alignment: "center",
              color: "#666666",
            },
            {
              table: {
                widths: [40],
                body: [
                  [
                    {
                      text: String(person.stationNumber),
                      fontSize: comfortable ? 24 : 18,
                      bold: true,
                      alignment: "center",
                      border: [true, true, true, true],
                      borderColor: "#222222",
                      margin: [1, 2, 1, 2],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => "#222222",
                vLineColor: () => "#222222",
              },
            },
          ],
          width: 48,
        } as Content)
      : null;

  const qrBlock: Content | null = qrDataUrl
    ? ({
        image: qrDataUrl,
        width: 24,
        height: 24,
        margin: [2, 0, 0, 0],
      } as Content)
    : null;

  const headerRight: Content[] = [];
  if (stationBlock) headerRight.push(stationBlock);
  if (qrBlock) headerRight.push(qrBlock);

  const headerInset = comfortable ? 10 : 8;
  const headerPadY = comfortable ? 10 : 8;
  const innerWidth = scorecardWidth - 2 * headerInset;

  const nameStack: Content[] = isBlank
    ? [blankNameRow(labels.name, innerWidth)]
    : [
        {
          text: nameText,
          fontSize: comfortable ? 14 : 12,
          bold: true,
          maxHeight: comfortable ? 28 : 18,
        } as Content,
      ];
  if (isNewcomer) {
    nameStack.push({
      text: labels.newcomer,
      fontSize: 8,
      bold: true,
      color: "#000000",
      margin: [0, 1, 0, 0],
    });
  }
  if (pbText) {
    nameStack.push({
      text: pbText,
      fontSize: 8,
      color: "#555555",
      margin: [0, 1, 0, 0],
    });
  }

  const sections: Content[] = [
    {
      columns: [
        {
          width: "*",
          stack: [
            {
              columns: [
                {
                  text: scorecardNumber != null ? String(scorecardNumber) : "",
                  fontSize: 10,
                  color: "#666666",
                  width: 28,
                },
                {
                  text: competitionName,
                  fontSize: 9,
                  color: "#666666",
                  alignment: "left",
                  width: "*",
                },
              ],
              margin: [0, 0, 0, 3],
            },
            { stack: nameStack },
          ],
        },
        ...(headerRight.length > 0
          ? [
              {
                width: "auto" as const,
                columns: headerRight,
                columnGap: 4,
              },
            ]
          : []),
      ],
      columnGap: 6,
      margin: [headerInset, headerPadY, headerInset, headerPadY],
    },
    (isBlank
      ? blankMetaTable(labels, innerWidth, printStations, [
          headerInset,
          0,
          headerInset,
          headerPadY + 2,
        ])
      : {
          text: [
            `${labels.event}: ${eventName || "—"}`,
            `${labels.round}: ${roundNumber ?? "—"}`,
            `${labels.group}: ${groupNumber ?? "—"}`,
            `${labels.id}: ${person?.registrantId ?? "—"}`,
          ].join("  ·  "),
          fontSize: 9,
          color: "#333333",
          margin: [headerInset, 0, headerInset, headerPadY + 2],
        }) as Content,
    {
      margin: [0, 2, 0, 0],
      table: {
        widths: attemptColumnWidths(layout, printScrambleChecker, comfortable),
        body: [
          attemptHeaderRow(layout, labels, printScrambleChecker, comfortable),
          ...attemptRows(
            formatInfo.attemptCount,
            cutoffAttempts,
            scorecardWidth,
            layout,
            printScrambleChecker,
            comfortable,
          ),
          [
            {
              text: labels.extra,
              ...noBorder,
              colSpan: colSpanFor(layout, printScrambleChecker, comfortable),
              margin: [0, 1],
              fontSize: 10,
            },
          ],
          attemptRow("–", layout, printScrambleChecker, comfortable),
        ],
      },
    },
    {
      fontSize: 9,
      margin: [0, 1, 0, 0],
      columns: [
        cutoffLabel ? { text: cutoffLabel, alignment: "left" } : { text: "" },
        timeLimitLabel
          ? { text: timeLimitLabel, alignment: "right" }
          : { text: "" },
      ],
    },
  ];

  return [
    {
      width: scorecardWidth,
      stack: sections,
    } as Content,
  ];
}

function applyStackedOrder(cards: CardSlot[], perPage: number): CardSlot[] {
  const rem = cards.length % perPage;
  const padded =
    rem === 0
      ? cards
      : [...cards, ...Array.from({ length: perPage - rem }, () => emptyCard())];
  return padded
    .map((card, idx) => ({ overallNumber: idx, card }))
    .sort((a, b) => {
      const sectionA = a.overallNumber % (padded.length / perPage);
      const sectionB = b.overallNumber % (padded.length / perPage);
      if (sectionA !== sectionB) return sectionA - sectionB;
      return a.overallNumber - b.overallNumber;
    })
    .map(({ card }) => card);
}

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function rankingsForPerson(
  person: Person,
  eventId: string,
): Pick<
  ScorecardPerson,
  | "worldRankingSingle"
  | "worldRankingAverage"
  | "nationalRankingAverage"
  | "pbSingle"
  | "pbAverage"
> {
  const single = (person.personalBests ?? []).find(
    (b) => b.eventId === eventId && b.type === "single",
  );
  const average = (person.personalBests ?? []).find(
    (b) => b.eventId === eventId && b.type === "average",
  );
  return {
    worldRankingSingle: single?.worldRanking ?? null,
    worldRankingAverage: average?.worldRanking ?? null,
    nationalRankingAverage: average?.nationalRanking ?? null,
    pbSingle: single?.best ?? null,
    pbAverage: average?.best ?? null,
  };
}

async function qrDataUrlFor(
  competitionId: string,
  registrantId: number,
  roundActivityCode: string,
): Promise<string | null> {
  try {
    return await QRCode.toDataURL(
      `${competitionId}:${registrantId}:${roundActivityCode}`,
      {
        margin: 0,
        width: 96,
        errorCorrectionLevel: "M",
      },
    );
  } catch {
    return null;
  }
}

export function collectAssignedScorecards(
  wcif: WCIF,
  roundActivityCode: string,
): ScorecardPerson[] {
  const groups = getGroupActivitiesForRound(wcif, roundActivityCode);
  if (groups.length === 0) {
    throw new Error(
      "Crea grupos y asignaciones antes de imprimir papeletas de esta ronda.",
    );
  }
  const groupIds = new Set(groups.map((g) => g.activity.id));
  const eventId = roundActivityCode.replace(/-r\d+$/, "");
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
      const parsedName = parseLocalName(person.name);
      rows.push({
        name: person.name,
        localName: parsedName.local,
        wcaId: person.wcaId,
        registrantId: person.registrantId,
        groupNumber: located
          ? parseGroupNumber(located.activity.activityCode)
          : null,
        stationNumber: assignment.stationNumber,
        roomName: located?.roomName ?? "",
        ...rankingsForPerson(person, eventId),
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
      return Math.max(
        collectAssignedScorecards(wcif, roundActivityCode).length,
        8,
      );
    } catch {
      return 16;
    }
  }
  const prevCode = `${parsed.eventId}-r${parsed.roundNumber - 1}`;
  try {
    return Math.max(collectAssignedScorecards(wcif, prevCode).length, 8);
  } catch {
    const competing = wcif.persons.filter(
      (p) =>
        p.registration?.isCompeting &&
        (p.registration.eventIds ?? []).includes(parsed.eventId as never),
    ).length;
    return Math.max(Math.ceil(competing / 2), 8);
  }
}

type ScorecardVariant = {
  key: string;
  eventId: string;
  format: string;
  formatInfo: FormatInfo;
  printScrambleChecker: boolean;
  cutoffAttempts: number | null;
  timeLimitLabel: string | null;
  cutoffLabel: string | null;
};

function collectScorecardVariants(
  wcif: WCIF,
  config: CompetitionConfig,
): ScorecardVariant[] {
  const seen = new Map<string, ScorecardVariant>();
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      const formatInfo = getFormatInfo(round.format ?? "a", event.id);
      const printScrambleChecker = shouldPrintScrambleChecker(
        event.id,
        round.id,
        wcif,
        null,
        "blank",
        config,
        formatInfo,
      );
      const layout = attemptLayoutOf(formatInfo);
      const key = `${layout}:${round.format ?? "a"}:${event.id}:${printScrambleChecker}`;
      if (seen.has(key)) continue;
      const cutoff = round.cutoff as
        | { numberOfAttempts?: number }
        | null
        | undefined;
      seen.set(key, {
        key,
        eventId: event.id,
        format: round.format ?? "a",
        formatInfo,
        printScrambleChecker,
        cutoffAttempts: cutoff?.numberOfAttempts ?? null,
        timeLimitLabel: timeLimitText(round),
        cutoffLabel: cutoffText(round, event.id),
      });
    }
  }
  return [...seen.values()];
}

async function buildAllAssignedCardList(
  wcif: WCIF,
  config: CompetitionConfig,
  paper: PaperLayout,
): Promise<CardSlot[]> {
  const allCards: CardSlot[] = [];
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      try {
        const people = collectAssignedScorecards(wcif, round.id);
        if (people.length === 0) continue;
        const cards = await buildCardList(
          wcif,
          round.id,
          "assigned",
          0,
          config,
          paper,
        );
        allCards.push(...cards);
      } catch {
        // Skip rounds without groups or assignments.
      }
    }
  }
  if (allCards.length === 0) {
    throw new Error("No hay asignaciones de competidor en ninguna ronda.");
  }
  return allCards;
}

function buildBlankVariantCardList(
  wcif: WCIF,
  config: CompetitionConfig,
  paper: PaperLayout,
): CardSlot[] {
  const variants = collectScorecardVariants(wcif, config);
  if (variants.length === 0) {
    throw new Error("No hay rondas en el WCIF.");
  }
  const labels = scorecardLabels();
  const competitionName = wcif.shortName || wcif.name;
  const scorecardWidth = scorecardCellWidth(paper);
  const comfortable =
    config.scorecardDensity === "comfortable" && paper.perPage === 2;
  const cards: CardSlot[] = [];

  for (const variant of variants) {
    const pageCards = Array.from({ length: paper.perPage }, () => ({
      kind: "scorecard" as const,
      content: buildScorecardContent({
        scorecardNumber: null,
        competitionName,
        eventName: null,
        eventId: variant.eventId,
        roundNumber: null,
        groupNumber: null,
        person: null,
        config,
        formatInfo: variant.formatInfo,
        cutoffAttempts: variant.cutoffAttempts,
        timeLimitLabel: variant.timeLimitLabel,
        cutoffLabel: variant.cutoffLabel,
        printScrambleChecker: variant.printScrambleChecker,
        scorecardWidth,
        labels,
        qrDataUrl: null,
        comfortable,
      }),
    }));
    cards.push(...pageCards);
  }

  return cards;
}

async function buildCardList(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  config: CompetitionConfig,
  paper: PaperLayout,
): Promise<CardSlot[]> {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const eventId = parsed?.eventId;
  const roundNumber = parsed?.roundNumber ?? null;
  const eventName = eventId ? (EVENT_NAMES[eventId] ?? eventId) : null;
  const round = wcif.events
    .find((e) => e.id === eventId)
    ?.rounds.find((r) => r.id === roundActivityCode);
  const formatInfo = getFormatInfo(round?.format ?? "a", eventId);
  const cutoff = round?.cutoff as
    | { numberOfAttempts?: number }
    | null
    | undefined;
  const cutoffAttempts = cutoff?.numberOfAttempts ?? null;
  const labels = scorecardLabels();
  const tl = timeLimitText(round);
  const co = cutoffText(round, eventId);
  const scorecardWidth = scorecardCellWidth(paper);
  const competitionName = wcif.shortName || wcif.name;
  const comfortable =
    config.scorecardDensity === "comfortable" && paper.perPage === 2;

  if (mode === "blank") {
    const n = Math.max(1, Math.min(blankCount, 500));
    const checker = shouldPrintScrambleChecker(
      eventId,
      roundActivityCode,
      wcif,
      null,
      mode,
      config,
      formatInfo,
    );
    return Array.from({ length: n }, () => ({
      kind: "scorecard" as const,
      content: buildScorecardContent({
        scorecardNumber: null,
        competitionName,
        eventName,
        eventId,
        roundNumber,
        groupNumber: null,
        person: null,
        config,
        formatInfo,
        cutoffAttempts,
        timeLimitLabel: tl,
        cutoffLabel: co,
        printScrambleChecker: checker,
        scorecardWidth,
        labels,
        qrDataUrl: null,
        comfortable,
      }),
    }));
  }

  const people = collectAssignedScorecards(wcif, roundActivityCode);
  if (people.length === 0) {
    throw new Error("No hay asignaciones de competidor en esta ronda.");
  }

  const qrCache = new Map<number, string | null>();
  if (config.printScorecardQr) {
    const ids = [
      ...new Set(
        people
          .map((p) => p.registrantId)
          .filter((id): id is number => id != null),
      ),
    ];
    await Promise.all(
      ids.map(async (id) => {
        qrCache.set(id, await qrDataUrlFor(wcif.id, id, roundActivityCode));
      }),
    );
  }

  const byGroup = new Map<number, ScorecardPerson[]>();
  for (const person of people) {
    const g = person.groupNumber ?? 0;
    const list = byGroup.get(g) ?? [];
    list.push(person);
    byGroup.set(g, list);
  }

  const cards: CardSlot[] = [];
  let remaining = people.length;

  for (const [groupNumber, groupPeople] of [...byGroup.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const groupCards: CardSlot[] = [];
    if (config.printScorecardsCoverSheets) {
      groupCards.push({
        kind: "cover",
        content: buildCoverSheet({
          competitionName,
          eventName: eventName ?? "",
          roundNumber: roundNumber ?? 1,
          groupNumber,
          roomName: groupPeople[0]?.roomName ?? "",
          numberOfScorecards: groupPeople.length,
          labels,
        }),
      });
    }

    let stationFallback = groupPeople.length;
    for (const person of groupPeople) {
      const checker = shouldPrintScrambleChecker(
        eventId,
        roundActivityCode,
        wcif,
        person,
        mode,
        config,
        formatInfo,
      );
      const registrantId = person.registrantId;
      const qrDataUrl =
        config.printScorecardQr && registrantId != null
          ? (qrCache.get(registrantId) ?? null)
          : null;
      groupCards.push({
        kind: "scorecard",
        content: buildScorecardContent({
          scorecardNumber: remaining--,
          competitionName,
          eventName,
          eventId,
          roundNumber,
          groupNumber,
          person: {
            ...person,
            stationNumber:
              person.stationNumber ??
              (config.printStations ? stationFallback-- : null),
          },
          config,
          formatInfo,
          cutoffAttempts,
          timeLimitLabel: tl,
          cutoffLabel: co,
          printScrambleChecker: checker,
          scorecardWidth,
          labels,
          qrDataUrl,
          comfortable,
        }),
      });
    }

    if (config.scorecardOrder !== "stacked") {
      const rem = groupCards.length % paper.perPage;
      if (rem !== 0) {
        groupCards.push(
          ...Array.from({ length: paper.perPage - rem }, () => emptyCard()),
        );
      }
    }
    cards.push(...groupCards);
  }

  if (config.scorecardOrder === "stacked") {
    return applyStackedOrder(cards, paper.perPage);
  }
  return cards;
}

export async function buildScorecardsDocument(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  competitionImageUrl?: string | null,
  /**
   * When provided (including `null`), use this as the background and do not
   * fall back to fetching a remote URL inside pdfmake.
   */
  backgroundDataUrl?: string | null,
): Promise<TDocumentDefinitions> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = await buildCardList(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
    config,
    paper,
  );
  return buildScorecardsDocumentFromCards(
    wcif,
    cards,
    `Papeletas — ${roundActivityCode}`,
    competitionImageUrl,
    backgroundDataUrl,
  );
}

async function buildScorecardsDocumentFromCards(
  wcif: WCIF,
  cards: CardSlot[],
  title: string,
  competitionImageUrl?: string | null,
  backgroundDataUrl?: string | null,
): Promise<TDocumentDefinitions> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const background =
    backgroundDataUrl !== undefined
      ? backgroundDataUrl
      : resolveScorecardsBackgroundUrl(config, competitionImageUrl);

  const bgSize = paper.perPage === 2 ? 220 : paper.perPage === 1 ? 180 : 160;
  const imagePositions = scorecardBackgroundPositions(paper, bgSize);
  const marks = cutLines(paper);

  const rowsPerPage = paper.perPage / paper.perRow;
  // Page margins already inset the table. Size rows so that
  // rows * rowHeight + (rows-1) * gap fits exactly in the usable area.
  // If this overflows by even a few points, pdfmake pushes the 2nd row to the
  // next page while background watermarks still draw in the empty slots.
  const usableHeight = paper.pageHeight - 2 * paper.vMargin;
  const rowGap = paper.vMargin;
  const rowHeight =
    (usableHeight - rowGap * Math.max(0, rowsPerPage - 1)) / rowsPerPage;
  const pageChunks = chunkRows(cards, paper.perPage).map((pageCards) =>
    pageCards.length < paper.perPage
      ? [
          ...pageCards,
          ...Array.from({ length: paper.perPage - pageCards.length }, () =>
            emptyCard(),
          ),
        ]
      : pageCards,
  );

  const pageTables: Content[] = pageChunks.map((pageCards, pageIndex) => ({
    ...(pageIndex < pageChunks.length - 1
      ? { pageBreak: "after" as const }
      : {}),
    layout: {
      // paddingLeft/Right receive column index; Top/Bottom receive row index.
      // Apply the shared gap on only one side so it isn't double-counted.
      paddingLeft: (i) => (i === 0 ? 0 : paper.hMargin),
      paddingRight: () => 0,
      paddingTop: (i) => (i === 0 ? 0 : rowGap),
      paddingBottom: () => 0,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
    },
    table: {
      widths: Array.from({ length: paper.perRow }, () => "*"),
      heights: rowHeight,
      dontBreakRows: true,
      body: chunkRows(pageCards.map(cardCellContent), paper.perRow),
    },
  }));

  const doc: TDocumentDefinitions = {
    info: {
      title,
      author: "Cubing México",
    },
    background: (currentPage) => {
      const pageCards = pageChunks[currentPage - 1] ?? [];
      const images = background
        ? imagePositions.flatMap((absolutePosition, slot) => {
            const card = pageCards[slot];
            if (!card || card.kind !== "scorecard") return [];
            return [
              {
                absolutePosition,
                image: "scorecardBg",
                width: bgSize,
                height: bgSize,
                opacity: 0.15,
              },
            ];
          })
        : [];
      return [...images, marks];
    },
    pageSize: { width: paper.pageWidth, height: paper.pageHeight },
    pageMargins: [paper.hMargin, paper.vMargin],
    content: pageTables,
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
    },
    language: "es",
  };

  if (background) {
    doc.images = { scorecardBg: background };
  }

  return doc;
}

export async function printScorecards(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const remoteUrl = resolveScorecardsBackgroundUrl(config, competitionImageUrl);
  const backgroundDataUrl = remoteUrl
    ? await loadImageAsDataUrl(remoteUrl)
    : null;

  if (remoteUrl && !backgroundDataUrl) {
    console.warn(
      "No se pudo cargar la imagen de fondo; se generan papeletas sin fondo.",
    );
  }

  const doc = await buildScorecardsDocument(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
    competitionImageUrl,
    backgroundDataUrl,
  );
  const suffix = mode === "blank" ? "blank" : "assigned";
  createGroupsPdf(
    doc,
    action,
    `${wcif.id}-${roundActivityCode}-scorecards-${suffix}`,
  );
}

async function printScorecardsFromCards(
  wcif: WCIF,
  cards: CardSlot[],
  title: string,
  filenameSuffix: string,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const remoteUrl = resolveScorecardsBackgroundUrl(config, competitionImageUrl);
  const backgroundDataUrl = remoteUrl
    ? await loadImageAsDataUrl(remoteUrl)
    : null;

  if (remoteUrl && !backgroundDataUrl) {
    console.warn(
      "No se pudo cargar la imagen de fondo; se generan papeletas sin fondo.",
    );
  }

  const doc = await buildScorecardsDocumentFromCards(
    wcif,
    cards,
    title,
    competitionImageUrl,
    backgroundDataUrl,
  );
  createGroupsPdf(doc, action, `${wcif.id}-${filenameSuffix}`);
}

export async function printAllAssignedScorecards(
  wcif: WCIF,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = await buildAllAssignedCardList(wcif, config, paper);
  await printScorecardsFromCards(
    wcif,
    cards,
    `Papeletas — ${wcif.shortName || wcif.name}`,
    "scorecards-assigned-all",
    action,
    competitionImageUrl,
  );
}

export async function printBlankScorecardVariants(
  wcif: WCIF,
  action: PrintAction,
  competitionImageUrl?: string | null,
): Promise<void> {
  const config = getCompetitionConfig(wcif);
  const paper = resolvePaperLayout(
    config.scorecardPaperSize,
    config.scorecardDensity,
  );
  const cards = buildBlankVariantCardList(wcif, config, paper);
  await printScorecardsFromCards(
    wcif,
    cards,
    `Papeletas en blanco — ${wcif.shortName || wcif.name}`,
    "scorecards-blank-variants",
    action,
    competitionImageUrl,
  );
}
