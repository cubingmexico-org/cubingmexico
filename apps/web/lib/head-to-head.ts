export type HeadToHeadSide = {
  pos: number | null;
  best: number;
  average: number;
  /** Representative competitor when a side is a team. */
  personId?: string;
  personName?: string | null;
};

export type HeadToHeadRound = {
  competitionId: string;
  competitionName: string;
  date: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  roundTypeId: string | null;
  a: HeadToHeadSide;
  b: HeadToHeadSide;
};

export type HeadToHeadWinner = "a" | "b" | "tie";

export type HeadToHeadEventSummary = {
  eventId: string;
  eventName: string;
  eventRank: number;
  aWins: number;
  bWins: number;
  ties: number;
};

export type HeadToHeadSummary = {
  aWins: number;
  bWins: number;
  ties: number;
  total: number;
  byEvent: HeadToHeadEventSummary[];
  lastMeeting: HeadToHeadRound | null;
};

function validPos(pos: number | null): number | null {
  return pos != null && pos > 0 ? pos : null;
}

export function getRoundWinner(round: HeadToHeadRound): HeadToHeadWinner {
  const aPos = validPos(round.a.pos);
  const bPos = validPos(round.b.pos);

  if (aPos === null && bPos === null) return "tie";
  if (aPos === null) return "b";
  if (bPos === null) return "a";
  if (aPos < bPos) return "a";
  if (bPos < aPos) return "b";
  return "tie";
}

/** Expects rounds ordered newest first. */
export function summarizeHeadToHead(
  rounds: HeadToHeadRound[],
): HeadToHeadSummary {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  const byEvent = new Map<string, HeadToHeadEventSummary>();

  for (const round of rounds) {
    const winner = getRoundWinner(round);
    const eventSummary = byEvent.get(round.eventId) ?? {
      eventId: round.eventId,
      eventName: round.eventName,
      eventRank: round.eventRank,
      aWins: 0,
      bWins: 0,
      ties: 0,
    };

    if (winner === "a") {
      aWins++;
      eventSummary.aWins++;
    } else if (winner === "b") {
      bWins++;
      eventSummary.bWins++;
    } else {
      ties++;
      eventSummary.ties++;
    }

    byEvent.set(round.eventId, eventSummary);
  }

  return {
    aWins,
    bWins,
    ties,
    total: rounds.length,
    byEvent: Array.from(byEvent.values()).sort(
      (left, right) => left.eventRank - right.eventRank,
    ),
    lastMeeting: rounds[0] ?? null,
  };
}
