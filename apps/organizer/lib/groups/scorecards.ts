import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Person, Round, WCIF } from "@/types/wcif";
import {
  getCompetitionConfig,
  type CompetitionConfig,
} from "@/lib/groups/config";
import { resolveScorecardsBackgroundUrl } from "@/lib/groups/competition-image";
import { getFormatInfo } from "@/lib/groups/formats";
import {
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { createGroupsPdf, type PrintAction } from "@/lib/groups/print-pdf";
import { loadImageAsDataUrl } from "@/lib/groups/load-image-data-url";

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

const PAPER = {
  a4: {
    pageWidth: 595.28,
    pageHeight: 841.89,
    perRow: 2,
    perPage: 4,
    hMargin: 15,
    vMargin: 15,
  },
  letter: {
    pageWidth: 612,
    pageHeight: 792,
    perRow: 2,
    perPage: 4,
    hMargin: 15,
    vMargin: 10,
  },
  a6: {
    pageWidth: 297.64,
    pageHeight: 419.53,
    perRow: 1,
    perPage: 1,
    hMargin: 15,
    vMargin: 15,
  },
} as const;

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
};

type CardSlot =
  | { kind: "cover"; content: Content[] }
  | { kind: "scorecard"; content: Content[] }
  | { kind: "empty" };

function emptyCard(): CardSlot {
  return { kind: "empty" };
}

function cardCellContent(card: CardSlot): Content {
  if (card.kind === "empty") return { text: "" };
  return card.content as unknown as Content;
}

/** Same offset in every quadrant (slightly above Groupifier's 170 for a more centered look). */
function scorecardBackgroundPositions(
  paper: (typeof PAPER)[keyof typeof PAPER],
) {
  const offsetX = 60;
  const offsetY = 145;
  if (paper.perPage === 1) {
    return [{ x: offsetX, y: offsetY }];
  }
  const halfW = paper.pageWidth / 2;
  const halfH = paper.pageHeight / 2;
  return [
    { x: offsetX, y: offsetY },
    { x: halfW + offsetX, y: offsetY },
    { x: offsetX, y: halfH + offsetY },
    { x: halfW + offsetX, y: halfH + offsetY },
  ];
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
): boolean {
  if (!eventId || NO_SCRAMBLE_CHECKER.has(eventId)) return false;
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

function timeLimitText(round: Round | undefined): string | null {
  const tl = round?.timeLimit as
    | { centiseconds?: number; cumulativeRoundIds?: string[] }
    | null
    | undefined;
  if (!tl?.centiseconds || tl.centiseconds <= 0) return null;
  return `Límite: ${formatCentiseconds(tl.centiseconds)}`;
}

function cutoffText(round: Round | undefined, eventId?: string): string | null {
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

function columnLabels(
  labels: Array<
    string | Record<string, unknown> | Array<Record<string, unknown>>
  >,
  style: Record<string, unknown> = {},
): Content[] {
  return labels.map((label) => {
    const base = {
      ...style,
      ...noBorder,
      fontSize: 9,
    };
    if (Array.isArray(label)) {
      return { ...base, columns: label } as unknown as Content;
    }
    if (typeof label === "string") {
      return { ...base, text: label } as unknown as Content;
    }
    return { ...base, ...label } as unknown as Content;
  });
}

function attemptRow(
  attemptNumber: number | string,
  needsScrambleChecker: boolean,
): Content[] {
  // Empty `{}` cells match Groupifier — `{ text: "" }` adds extra line box height
  // and can push the 2nd row of a page onto the next sheet.
  return [
    {
      text: String(attemptNumber),
      ...noBorder,
      fontSize: 20,
      bold: true,
      alignment: "center",
    },
    {},
    ...(needsScrambleChecker ? [{}] : []),
    {},
    {},
    {},
  ] as Content[];
}

function attemptRows(
  attemptCount: number,
  cutoffAttempts: number | null,
  scorecardWidth: number,
  printScrambleChecker: boolean,
): Content[][] {
  const rows: Content[][] = [];
  for (let i = 0; i < attemptCount; i++) {
    rows.push(attemptRow(i + 1, printScrambleChecker));
    if (i < attemptCount - 1) {
      const isCutoffLine = cutoffAttempts != null && i + 1 === cutoffAttempts;
      rows.push([
        {
          ...noBorder,
          colSpan: 5 + (printScrambleChecker ? 1 : 0),
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

function initialsField(person: string): Content {
  return {
    text: [{ text: `Iniciales ${person}`, bold: true }, " ______"],
    alignment: "center",
    fontSize: 10,
  };
}

function buildCoverSheet(params: {
  competitionName: string;
  eventName: string;
  roundNumber: number;
  groupNumber: number;
  roomName: string;
  numberOfScorecards: number;
}): Content[] {
  const {
    competitionName,
    eventName,
    roundNumber,
    groupNumber,
    roomName,
    numberOfScorecards,
  } = params;
  // Keep vertical margins tight so cover + scorecard rows fit 2-per-page on Letter.
  const m = [0, 4] as [number, number];
  const mLeft = [20, 4, 0, 4] as [number, number, number, number];

  return [
    {
      text: competitionName,
      bold: true,
      fontSize: 15,
      margin: m,
      alignment: "center",
    },
    {
      text: `${eventName} Ronda ${roundNumber}`,
      fontSize: 15,
      margin: m,
      alignment: "center",
    },
    {
      text: `Grupo ${groupNumber}${roomName ? ` (${roomName})` : ""}`,
      fontSize: 15,
      margin: m,
      alignment: "center",
    },
    {
      text: "-------------------- PARA DELEGADO --------------------",
      alignment: "center",
      margin: m,
    },
    {
      text: [
        "1. Empaquetadas las ",
        { text: String(numberOfScorecards), bold: true },
        " scorecards ",
        "[ ]",
      ],
      fontSize: 10,
      margin: mLeft,
    },
    {
      text: "2. Revisadas firmas faltantes [ ]",
      fontSize: 10,
      margin: mLeft,
    },
    {
      text: "3. Scorecards con incidentes: ______",
      fontSize: 10,
      margin: mLeft,
    },
    initialsField("Delegado"),
    {
      text: "-------------------- PARA CAPTURA --------------------",
      alignment: "center",
      margin: m,
    },
    {
      text: "4. Resultados capturados por Capturista",
      fontSize: 10,
      margin: mLeft,
    },
    initialsField("Capturista"),
    {
      text: "5. Incidentes registrados por Delegado",
      fontSize: 10,
      margin: mLeft,
    },
    initialsField("Delegado"),
    {
      text: "6. Resultados revisados por Delegado",
      fontSize: 10,
      margin: mLeft,
    },
    initialsField("Delegado"),
  ];
}

function buildScorecardContent(params: {
  scorecardNumber: number | null;
  competitionName: string;
  eventName: string | null;
  roundNumber: number | null;
  groupNumber: number | null;
  person: ScorecardPerson | null;
  config: CompetitionConfig;
  attemptCount: number;
  cutoffAttempts: number | null;
  timeLimitLabel: string | null;
  cutoffLabel: string | null;
  printScrambleChecker: boolean;
  scorecardWidth: number;
}): Content[] {
  const {
    scorecardNumber,
    competitionName,
    eventName,
    roundNumber,
    groupNumber,
    person,
    config,
    attemptCount,
    cutoffAttempts,
    timeLimitLabel,
    cutoffLabel,
    printScrambleChecker,
    scorecardWidth,
  } = params;

  const printStations = config.printStations;
  const nameText = person ? displayName(person, config) : " ";
  const isNewcomer =
    person?.name && person.registrantId != null && !person.wcaId;

  return [
    {
      fontSize: 10,
      columns: [
        {
          text: scorecardNumber != null ? String(scorecardNumber) : "",
          alignment: "left",
        },
        { text: "" },
      ],
    },
    {
      text: competitionName,
      bold: true,
      fontSize: 15,
      margin: [0, 0, 0, 8],
      alignment: "center",
    },
    {
      margin: [25, 0, 0, 0],
      table: {
        widths: ["*", 30, 30, ...(printStations ? [30] : [])],
        body: [
          columnLabels([
            "Evento",
            { text: "Ronda", alignment: "center" },
            { text: "Grupo", alignment: "center" },
            ...(printStations ? [{ text: "Est.", alignment: "center" }] : []),
          ]),
          [
            { text: eventName || " " },
            { text: String(roundNumber ?? " "), alignment: "center" },
            { text: String(groupNumber ?? " "), alignment: "center" },
            ...(printStations
              ? [
                  {
                    text: String(person?.stationNumber ?? " "),
                    alignment: "center" as const,
                  },
                ]
              : []),
          ],
        ],
      },
    },
    {
      margin: [25, 0, 0, 0],
      table: {
        widths: [30, "*"],
        body: [
          columnLabels([
            { text: "ID", alignment: "center" },
            [
              { text: "Nombre", alignment: "left" },
              {
                text: isNewcomer ? "Nuevo" : " ",
                alignment: "right",
              },
            ],
          ]),
          [
            {
              text: String(person?.registrantId ?? " "),
              alignment: "center",
            },
            {
              text: nameText,
              // Prevent long names from stretching the card past half-page height.
              // pdfmake supports maxHeight though typings omit it.
              maxHeight: 20,
            } as Content,
          ],
        ],
      },
    },
    {
      margin: [0, 8, 0, 0],
      table: {
        widths: [16, 25, ...(printScrambleChecker ? [25] : []), "*", 25, 25],
        body: [
          columnLabels(
            [
              "",
              { text: "Scr", alignment: "center" },
              ...(printScrambleChecker
                ? [{ text: "Chk", alignment: "center" }]
                : []),
              { text: "Resultado", alignment: "center" },
              { text: "Juez", alignment: "center" },
              { text: "Comp", alignment: "center" },
            ],
            { alignment: "center" },
          ),
          ...attemptRows(
            attemptCount,
            cutoffAttempts,
            scorecardWidth,
            printScrambleChecker,
          ),
          [
            {
              text: "Extra (iniciales delegado _______)",
              ...noBorder,
              colSpan: 5 + (printScrambleChecker ? 1 : 0),
              margin: [0, 1],
              fontSize: 10,
            },
          ],
          attemptRow("–", printScrambleChecker),
          [
            {
              text: "",
              ...noBorder,
              colSpan: 5 + (printScrambleChecker ? 1 : 0),
              margin: [0, 1],
            },
          ],
        ],
      },
    },
    {
      fontSize: 10,
      columns: [
        cutoffLabel ? { text: cutoffLabel, alignment: "center" } : { text: "" },
        timeLimitLabel
          ? { text: timeLimitLabel, alignment: "center" }
          : { text: "" },
      ],
    },
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
  "worldRankingSingle" | "worldRankingAverage" | "nationalRankingAverage"
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

function buildCardList(
  wcif: WCIF,
  roundActivityCode: string,
  mode: ScorecardMode,
  blankCount: number,
  config: CompetitionConfig,
  paper: (typeof PAPER)[keyof typeof PAPER],
): CardSlot[] {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const eventId = parsed?.eventId;
  const roundNumber = parsed?.roundNumber ?? null;
  const eventName = eventId ? (EVENT_NAMES[eventId] ?? eventId) : null;
  const round = wcif.events
    .find((e) => e.id === eventId)
    ?.rounds.find((r) => r.id === roundActivityCode);
  const formatInfo = getFormatInfo(round?.format ?? "a", eventId);
  const attemptCount = formatInfo.attemptCount;
  const cutoff = round?.cutoff as
    | { numberOfAttempts?: number }
    | null
    | undefined;
  const cutoffAttempts = cutoff?.numberOfAttempts ?? null;
  const tl = timeLimitText(round);
  const co = cutoffText(round, eventId);
  const scorecardWidth = paper.pageWidth / paper.perRow - 2 * paper.hMargin;
  const competitionName = wcif.shortName || wcif.name;

  if (mode === "blank") {
    const n = Math.max(1, Math.min(blankCount, 500));
    const checker = shouldPrintScrambleChecker(
      eventId,
      roundActivityCode,
      wcif,
      null,
      mode,
      config,
    );
    return Array.from({ length: n }, () => ({
      kind: "scorecard" as const,
      content: buildScorecardContent({
        scorecardNumber: null,
        competitionName,
        eventName,
        roundNumber,
        groupNumber: null,
        person: null,
        config,
        attemptCount,
        cutoffAttempts,
        timeLimitLabel: tl,
        cutoffLabel: co,
        printScrambleChecker: checker,
        scorecardWidth,
      }),
    }));
  }

  const people = collectAssignedScorecards(wcif, roundActivityCode);
  if (people.length === 0) {
    throw new Error("No hay asignaciones de competidor en esta ronda.");
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
      );
      groupCards.push({
        kind: "scorecard",
        content: buildScorecardContent({
          scorecardNumber: remaining--,
          competitionName,
          eventName,
          roundNumber,
          groupNumber,
          person: {
            ...person,
            stationNumber:
              person.stationNumber ??
              (config.printStations ? stationFallback-- : null),
          },
          config,
          attemptCount,
          cutoffAttempts,
          timeLimitLabel: tl,
          cutoffLabel: co,
          printScrambleChecker: checker,
          scorecardWidth,
        }),
      });
    }

    // Pad each group so its last page is full (Groupifier behaviour).
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

export function buildScorecardsDocument(
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
): TDocumentDefinitions {
  const config = getCompetitionConfig(wcif);
  const paper = PAPER[config.scorecardPaperSize] ?? PAPER.letter;
  const background =
    backgroundDataUrl !== undefined
      ? backgroundDataUrl
      : resolveScorecardsBackgroundUrl(config, competitionImageUrl);

  const cards = buildCardList(
    wcif,
    roundActivityCode,
    mode,
    blankCount,
    config,
    paper,
  );

  const imagePositions = scorecardBackgroundPositions(paper);

  const cutLines: Content =
    paper.perPage === 4
      ? {
          canvas: [
            {
              type: "line",
              x1: paper.hMargin,
              y1: paper.pageHeight / 2,
              x2: paper.pageWidth - paper.hMargin,
              y2: paper.pageHeight / 2,
              lineWidth: 0.1,
              dash: { length: 10 },
              lineColor: "#888888",
            },
            {
              type: "line",
              x1: paper.pageWidth / 2,
              y1: paper.vMargin,
              x2: paper.pageWidth / 2,
              y2: paper.pageHeight - paper.vMargin,
              lineWidth: 0.1,
              dash: { length: 10 },
              lineColor: "#888888",
            },
          ],
        }
      : { text: "" };

  const rowHeight = paper.pageHeight / paper.perRow - 2 * paper.vMargin;
  const pageChunks = chunkRows(cards, paper.perPage).map((pageCards) =>
    pageCards.length < paper.perPage
      ? [
          ...pageCards,
          ...Array.from(
            { length: paper.perPage - pageCards.length },
            () => emptyCard(),
          ),
        ]
      : pageCards,
  );

  const pageTables: Content[] = pageChunks.map((pageCards, pageIndex) => ({
    ...(pageIndex < pageChunks.length - 1
      ? { pageBreak: "after" as const }
      : {}),
    layout: {
      // Outer margin is pageMargins; padding is the remaining inner gap.
      paddingLeft: (i) => (i % paper.perRow === 0 ? 0 : paper.hMargin),
      paddingRight: (i) =>
        i % paper.perRow === paper.perRow - 1 ? 0 : paper.hMargin,
      paddingTop: (i) => (i % paper.perRow === 0 ? 0 : paper.vMargin),
      paddingBottom: (i) =>
        i % paper.perRow === paper.perRow - 1 ? 0 : paper.vMargin,
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
      title: `Scorecards — ${roundActivityCode}`,
      author: "Cubing México",
    },
    background: (currentPage) => {
      const pageCards = pageChunks[currentPage - 1] ?? [];
      const images = background
        ? imagePositions.flatMap((absolutePosition, slot) => {
            const card = pageCards[slot];
            // Covers and empty pads stay without watermark.
            if (!card || card.kind !== "scorecard") return [];
            return [
              {
                absolutePosition,
                image: "scorecardBg",
                width: 200,
                height: 200,
                opacity: 0.15,
              },
            ];
          })
        : [];
      return [...images, cutLines];
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
      "No se pudo cargar la imagen de fondo; se generan scorecards sin fondo.",
    );
  }

  const doc = buildScorecardsDocument(
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
