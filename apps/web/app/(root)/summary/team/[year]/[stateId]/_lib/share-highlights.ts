export type ShareHighlightTone = "default" | "gold" | "silver" | "bronze";

export type ShareHighlight = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone?: ShareHighlightTone;
};

/** Minimal summary fields needed to build team share-card highlights. */
export type TeamShareHighlightSource = {
  hosted: {
    competitionCount: number;
    totalCompetitors: number;
    newcomers: number;
    solves: {
      totalSolves: number;
      totalDnfs: number;
    };
  };
  members: {
    podiums: {
      total: number;
      gold: number;
      silver: number;
      bronze: number;
    };
    records: {
      wr: number;
      nar: number;
      nr: number;
      sr: number;
    };
    foreign: {
      competitorCount: number;
    };
  };
  staff: {
    newDelegates: unknown[];
  };
};

/** Portrait cards use a 2×4 grid. */
const MAX_HIGHLIGHTS = 8;

function formatInt(n: number): string {
  return n.toLocaleString("es-MX");
}

/**
 * Pick up to 8 non-zero highlight stats in priority order for the team share card.
 */
export function getTeamShareHighlights(
  source: TeamShareHighlightSource,
): ShareHighlight[] {
  const highlights: ShareHighlight[] = [];

  const push = (h: ShareHighlight) => {
    if (highlights.length < MAX_HIGHLIGHTS) highlights.push(h);
  };

  if (source.hosted.competitionCount > 0) {
    push({
      id: "competitions",
      label:
        source.hosted.competitionCount === 1 ? "Competencia" : "Competencias",
      value: formatInt(source.hosted.competitionCount),
      detail: "organizadas en el estado",
    });
  }

  if (source.hosted.totalCompetitors > 0) {
    push({
      id: "competitors",
      label:
        source.hosted.totalCompetitors === 1 ? "Competidor" : "Competidores",
      value: formatInt(source.hosted.totalCompetitors),
      detail: "en competencias del estado",
    });
  }

  if (source.hosted.newcomers > 0) {
    push({
      id: "newcomers",
      label: source.hosted.newcomers === 1 ? "Debutante" : "Debutantes",
      value: formatInt(source.hosted.newcomers),
      detail: "del Team",
    });
  }

  if (source.members.podiums.total > 0) {
    const { gold, silver, bronze } = source.members.podiums;
    const medals = [
      gold > 0 ? `${formatInt(gold)} oro` : null,
      silver > 0 ? `${formatInt(silver)} plata` : null,
      bronze > 0 ? `${formatInt(bronze)} bronce` : null,
    ].filter(Boolean);
    push({
      id: "podiums",
      label: source.members.podiums.total === 1 ? "Podio" : "Podios",
      value: formatInt(source.members.podiums.total),
      detail: medals.length > 0 ? medals.join(" · ") : undefined,
      tone: "gold",
    });
  }

  if (source.members.records.sr > 0) {
    push({
      id: "sr",
      label: source.members.records.sr === 1 ? "SR" : "SRs",
      value: formatInt(source.members.records.sr),
    });
  }

  const regionalTotal =
    source.members.records.wr +
    source.members.records.nar +
    source.members.records.nr;
  if (regionalTotal > 0) {
    const parts: string[] = [];
    if (source.members.records.wr > 0)
      parts.push(`${formatInt(source.members.records.wr)} WR`);
    if (source.members.records.nar > 0)
      parts.push(`${formatInt(source.members.records.nar)} NAR`);
    if (source.members.records.nr > 0)
      parts.push(`${formatInt(source.members.records.nr)} NR`);
    push({
      id: "regional-records",
      label: regionalTotal === 1 ? "Récord" : "Récords",
      value: formatInt(regionalTotal),
      detail: parts.join(" · "),
    });
  }

  if (source.members.foreign.competitorCount > 0) {
    push({
      id: "foreign",
      label:
        source.members.foreign.competitorCount === 1 ? "Viajero" : "Viajeros",
      value: formatInt(source.members.foreign.competitorCount),
      detail: "en competencias extranjeras",
    });
  }

  if (source.hosted.solves.totalSolves > 0) {
    push({
      id: "solves",
      label:
        source.hosted.solves.totalSolves === 1 ? "Resolución" : "Resoluciones",
      value: formatInt(source.hosted.solves.totalSolves),
      detail:
        source.hosted.solves.totalDnfs > 0
          ? `${formatInt(source.hosted.solves.totalDnfs)} DNF`
          : undefined,
    });
  }

  if (source.staff.newDelegates.length > 0) {
    push({
      id: "new-delegates",
      label:
        source.staff.newDelegates.length === 1
          ? "Nuevo delegado"
          : "Nuevos delegados",
      value: formatInt(source.staff.newDelegates.length),
    });
  }

  return highlights;
}

export type TeamShareCardData = {
  name: string;
  stateName: string;
  stateId: string;
  image: string | null;
  year: number;
  highlights: ShareHighlight[];
};
