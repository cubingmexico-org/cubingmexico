import type { Content } from "pdfmake/interfaces";
import type { EventId, Round, WCIF } from "@/types/wcif";
import { type CompetitionConfig } from "@/lib/groups/config";
import { type FormatInfo } from "@/lib/groups/formats";
import { formatResults } from "@/lib/utils";
import { noBorder } from "./layout";
import type { ScorecardMode, ScorecardPerson } from "./types";

export const EVENT_NAMES: Record<string, string> = {
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
  fto: "FTO",
};

const NO_SCRAMBLE_CHECKER = new Set(["555", "666", "777", "minx"]);

export type ScorecardLabels = {
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

export function scorecardLabels(): ScorecardLabels {
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

export function parseLocalName(fullName: string): {
  latin: string;
  local: string | null;
} {
  const match = /^(.+?)\s*\((.+)\)$/.exec(fullName.trim());
  if (match?.[1] && match[2]) {
    return { latin: match[1].trim(), local: match[2].trim() };
  }
  return { latin: fullName, local: null };
}

export function displayName(
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

export function shouldPrintScrambleChecker(
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

export function pbLineText(
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

export function timeLimitText(round: Round | undefined): string | null {
  const tl = round?.timeLimit;
  if (!tl?.centiseconds || tl.centiseconds <= 0) return null;
  return `Límite: ${formatCentiseconds(tl.centiseconds)}`;
}

export function cutoffText(
  round: Round | undefined,
  eventId: string | undefined,
): string | null {
  const cutoff = round?.cutoff;
  if (!cutoff?.resultValue || cutoff.resultValue <= 0) return null;
  const attempts = cutoff.numberOfAttempts ?? 2;
  if (eventId === "333fm") {
    return `Corte: ${cutoff.resultValue} mov. (${attempts} int.)`;
  }
  return `Corte: ${formatCentiseconds(cutoff.resultValue)} (${attempts} int.)`;
}

export function labelCell(
  text: string,
  style: Record<string, unknown> = {},
): Content {
  return {
    text,
    ...noBorder,
    fontSize: 9,
    ...style,
  } as Content;
}
