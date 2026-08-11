export type ShareHighlightTone = "default" | "gold" | "silver" | "bronze";

export type ShareHighlight = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: ShareHighlightTone;
};

/** Minimal summary fields needed to build share-card highlights. */
export type ShareHighlightSource = {
  competitionCount: number;
  eventCount: number;
  podiums: {
    total: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  personalBests: {
    totalBreaks: number;
    singleBreaks: number;
    averageBreaks: number;
  };
  solves: {
    totalSolves: number;
    totalAttempts: number;
  };
  records: {
    wr: number;
    nar: number;
    nr: number;
    sr: number;
  };
  championshipPodiums: {
    total: number;
  };
  travelKm: number | null;
  prStreak: {
    length: number;
  } | null;
  states: {
    visits: { stateId: string }[];
    firstTime: { stateId: string }[];
  };
  staff: {
    organized: unknown[];
    delegated: unknown[];
  };
};

/** Portrait cards use a 2×4 grid. */
const MAX_HIGHLIGHTS = 8;

function formatInt(n: number): string {
  return n.toLocaleString("es-MX");
}

/**
 * Pick up to 8 non-zero highlight stats in priority order for the share card.
 */
export function getShareHighlights(
  source: ShareHighlightSource,
): ShareHighlight[] {
  const highlights: ShareHighlight[] = [];

  const push = (h: ShareHighlight) => {
    if (highlights.length < MAX_HIGHLIGHTS) highlights.push(h);
  };

  if (source.competitionCount > 0) {
    push({
      id: "competitions",
      label: source.competitionCount === 1 ? "Competencia" : "Competencias",
      value: formatInt(source.competitionCount),
    });
  }

  if (source.podiums.total > 0) {
    const { gold, silver, bronze } = source.podiums;
    const medals = [
      gold > 0 ? `${formatInt(gold)} oro` : null,
      silver > 0 ? `${formatInt(silver)} plata` : null,
      bronze > 0 ? `${formatInt(bronze)} bronce` : null,
    ].filter(Boolean);
    push({
      id: "podiums",
      label: source.podiums.total === 1 ? "Podio" : "Podios",
      value: formatInt(source.podiums.total),
      detail: medals.length > 0 ? medals.join(" · ") : undefined,
      tone: "gold",
    });
  }

  if (source.personalBests.totalBreaks > 0) {
    const { singleBreaks, averageBreaks } = source.personalBests;
    const prParts = [
      singleBreaks > 0
        ? `${formatInt(singleBreaks)} ${singleBreaks === 1 ? "single" : "singles"}`
        : null,
      averageBreaks > 0
        ? `${formatInt(averageBreaks)} ${averageBreaks === 1 ? "average" : "averages"}`
        : null,
    ].filter(Boolean);
    push({
      id: "prs",
      label:
        source.personalBests.totalBreaks === 1
          ? "Récord personal"
          : "Récords personales",
      value: formatInt(source.personalBests.totalBreaks),
      detail: prParts.length > 0 ? prParts.join(" · ") : undefined,
    });
  }

  if (source.solves.totalSolves > 0) {
    push({
      id: "solves",
      label: source.solves.totalSolves === 1 ? "Resolución" : "Resoluciones",
      value: formatInt(source.solves.totalSolves),
      detail:
        source.solves.totalAttempts > 0
          ? `${formatInt(source.solves.totalAttempts)} ${
              source.solves.totalAttempts === 1 ? "intento" : "intentos"
            }`
          : undefined,
    });
  }

  const recordsTotal =
    source.records.wr +
    source.records.nar +
    source.records.nr +
    source.records.sr;
  if (recordsTotal > 0) {
    const parts: string[] = [];
    if (source.records.wr > 0) parts.push(`${formatInt(source.records.wr)} WR`);
    if (source.records.nar > 0)
      parts.push(`${formatInt(source.records.nar)} NAR`);
    if (source.records.nr > 0) parts.push(`${formatInt(source.records.nr)} NR`);
    if (source.records.sr > 0) parts.push(`${formatInt(source.records.sr)} SR`);
    push({
      id: "records",
      label: recordsTotal === 1 ? "Récord" : "Récords",
      value: formatInt(recordsTotal),
      detail: parts.join(" · "),
    });
  }

  if (source.championshipPodiums.total > 0) {
    push({
      id: "championship",
      label:
        source.championshipPodiums.total === 1
          ? "Podio de campeonato"
          : "Podios de campeonato",
      value: formatInt(source.championshipPodiums.total),
      tone: "gold",
    });
  }

  if (source.travelKm != null && source.travelKm > 0) {
    push({
      id: "travel",
      label: "Kilómetros",
      value: formatInt(Math.round(source.travelKm)),
      detail: "recorridos en línea recta",
    });
  }

  if (source.prStreak != null && source.prStreak.length >= 2) {
    push({
      id: "pr-streak",
      label: "Mejor racha",
      value: formatInt(source.prStreak.length),
      detail:
        source.prStreak.length === 1
          ? "competencia con PR"
          : "competencias con PR",
    });
  }

  if (source.states.visits.length > 0) {
    const firstTime = source.states.firstTime.length;
    push({
      id: "states",
      label: source.states.visits.length === 1 ? "Estado" : "Estados",
      value: formatInt(source.states.visits.length),
      detail:
        firstTime > 0 ? `${formatInt(firstTime)} por primera vez` : undefined,
    });
  }

  if (source.eventCount > 0) {
    push({
      id: "events",
      label: source.eventCount === 1 ? "Evento" : "Eventos",
      value: formatInt(source.eventCount),
    });
  }

  const staffTotal =
    source.staff.organized.length + source.staff.delegated.length;
  if (staffTotal > 0) {
    const parts = [
      source.staff.organized.length > 0
        ? `${formatInt(source.staff.organized.length)} org.`
        : null,
      source.staff.delegated.length > 0
        ? `${formatInt(source.staff.delegated.length)} del.`
        : null,
    ].filter(Boolean);
    push({
      id: "staff",
      label: "Organización",
      value: formatInt(staffTotal),
      detail: parts.join(" · "),
    });
  }

  return highlights;
}

export type ShareCardData = {
  name: string;
  wcaId: string;
  year: number;
  highlights: ShareHighlight[];
};
