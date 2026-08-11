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
    season: {
      activeMembers: number;
      competitionCount: number;
    };
    growth: {
      prevYear: number | null;
      activeMembersDelta: number | null;
    };
    retention: {
      previousActive: number;
      returned: number;
    };
    biggestTurnout: {
      memberCount: number;
    } | null;
    mostDiverseComp: {
      distinctTeams: number;
    } | null;
    crossedTeams: unknown[];
    debuts: number;
    dominantEvents: Array<{
      eventName: string;
      total: number;
      gold: number;
    }>;
    podiums: {
      total: number;
      gold: number;
      silver: number;
      bronze: number;
    };
    championshipPodiums: {
      total: number;
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
    kinchSor: {
      kinchBefore: number;
      kinchAfter: number;
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

function formatDelta(n: number): string {
  if (n > 0) return `+${formatInt(n)}`;
  return formatInt(n);
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

  if (source.members.season.activeMembers > 0) {
    push({
      id: "active-members",
      label: source.members.season.activeMembers === 1 ? "Miembro" : "Miembros",
      value: formatInt(source.members.season.activeMembers),
      detail:
        source.members.season.competitionCount > 0
          ? `${formatInt(source.members.season.competitionCount)} ${
              source.members.season.competitionCount === 1
                ? "competencia"
                : "competencias"
            }`
          : undefined,
    });
  }

  if (
    source.members.growth.prevYear !== null &&
    source.members.growth.activeMembersDelta !== null &&
    source.members.growth.activeMembersDelta !== 0
  ) {
    push({
      id: "growth",
      label: "Crecimiento",
      value: formatDelta(source.members.growth.activeMembersDelta),
      detail: `miembros vs ${source.members.growth.prevYear}`,
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

  if (
    source.members.biggestTurnout &&
    source.members.biggestTurnout.memberCount >= 2
  ) {
    push({
      id: "turnout",
      label: "Mayor reunión",
      value: formatInt(source.members.biggestTurnout.memberCount),
      detail: "miembros en una competencia",
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

  if (source.members.debuts > 0) {
    push({
      id: "debuts",
      label: source.members.debuts === 1 ? "Debutante" : "Debutantes",
      value: formatInt(source.members.debuts),
      detail: "del Team en la WCA",
    });
  } else if (source.hosted.newcomers > 0) {
    push({
      id: "newcomers",
      label: source.hosted.newcomers === 1 ? "Debutante" : "Debutantes",
      value: formatInt(source.hosted.newcomers),
      detail: "en competencias del estado",
    });
  }

  if (
    source.members.retention.previousActive >= 5 &&
    source.members.retention.returned > 0
  ) {
    const rate = Math.round(
      (source.members.retention.returned /
        source.members.retention.previousActive) *
        100,
    );
    push({
      id: "retention",
      label: "Retención",
      value: `${rate}%`,
      detail: `${formatInt(source.members.retention.returned)} de ${formatInt(source.members.retention.previousActive)}`,
    });
  }

  if (source.members.championshipPodiums.total > 0) {
    push({
      id: "championship",
      label:
        source.members.championshipPodiums.total === 1
          ? "Podio de campeonato"
          : "Podios de campeonato",
      value: formatInt(source.members.championshipPodiums.total),
      tone: "gold",
    });
  }

  const kinchDelta =
    source.members.kinchSor.kinchAfter - source.members.kinchSor.kinchBefore;
  if (source.members.kinchSor.kinchAfter > 0) {
    push({
      id: "kinch",
      label: "Kinch",
      value: source.members.kinchSor.kinchAfter.toFixed(1),
      detail:
        kinchDelta !== 0
          ? `${kinchDelta > 0 ? "+" : ""}${kinchDelta.toFixed(1)} en el año`
          : undefined,
    });
  }

  if (
    source.members.mostDiverseComp &&
    source.members.mostDiverseComp.distinctTeams >= 2
  ) {
    push({
      id: "diverse-comp",
      label: "Más Teams",
      value: formatInt(source.members.mostDiverseComp.distinctTeams),
      detail: "en una competencia",
    });
  }

  const topEvent = source.members.dominantEvents[0];
  if (topEvent && topEvent.total > 0) {
    push({
      id: "dominant-event",
      label: topEvent.eventName,
      value: formatInt(topEvent.total),
      detail:
        topEvent.gold > 0
          ? `${formatInt(topEvent.gold)} oro · podios`
          : "podios",
      tone: "gold",
    });
  }

  if (source.members.crossedTeams.length > 0) {
    push({
      id: "crossed-teams",
      label:
        source.members.crossedTeams.length === 1
          ? "Team coincidente"
          : "Teams coincidentes",
      value: formatInt(source.members.crossedTeams.length),
      detail: "en las mismas competencias",
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

  if (source.hosted.totalCompetitors > 0) {
    push({
      id: "competitors",
      label:
        source.hosted.totalCompetitors === 1 ? "Competidor" : "Competidores",
      value: formatInt(source.hosted.totalCompetitors),
      detail: "en competencias del estado",
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
