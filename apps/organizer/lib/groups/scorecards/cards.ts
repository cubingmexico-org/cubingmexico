import type { Content } from "pdfmake/interfaces";
import QRCode from "qrcode";
import type { Person, WCIF } from "@/types/wcif";
import { type CompetitionConfig } from "@/lib/groups/config";
import { getFormatInfo, type FormatInfo } from "@/lib/groups/formats";
import {
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { attemptLayoutOf } from "./attempts";
import { buildCoverSheet, buildScorecardContent } from "./content";
import {
  EVENT_NAMES,
  cutoffText,
  parseLocalName,
  scorecardLabels,
  shouldPrintScrambleChecker,
  timeLimitText,
} from "./labels";
import { type PaperLayout, scorecardCellWidth } from "./layout";
import type { CardSlot, ScorecardMode, ScorecardPerson } from "./types";

export function emptyCard(): CardSlot {
  return { kind: "empty" };
}

export function cardCellContent(card: CardSlot): Content {
  if (card.kind === "empty") return { text: "" };
  return card.content as unknown as Content;
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

export function chunkRows<T>(items: T[], size: number): T[][] {
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
    pbSingle: single?.value ?? null,
    pbAverage: average?.value ?? null,
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
      const cutoff = round.cutoff;
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

export async function buildAllAssignedCardList(
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

export function buildBlankVariantCardList(
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

export async function buildCardList(
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
  const cutoff = round?.cutoff;
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
