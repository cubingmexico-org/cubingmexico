/**
 * Derive per-round local end dates from a WCA WCIF schedule (regulation 9i2).
 * Mirrors apps/backend/utils.py extract_round_end_dates_from_wcif.
 */

export type RoundEndDateRow = {
  eventId: string;
  roundTypeId: string;
  endDate: string; // YYYY-MM-DD
};

type WcifCutoff = { numberOfAttempts?: number } | null;

type WcifRound = {
  id: string;
  format?: string;
  cutoff?: WcifCutoff;
};

type WcifEvent = {
  id: string;
  rounds?: WcifRound[];
};

type WcifActivity = {
  activityCode: string;
  startTime?: string;
  endTime?: string;
  childActivities?: WcifActivity[];
};

type WcifRoom = {
  activities?: WcifActivity[];
};

type WcifVenue = {
  timezone?: string;
  rooms?: WcifRoom[];
};

export type WcifLike = {
  events?: WcifEvent[];
  schedule?: {
    venues?: WcifVenue[];
  };
};

const ROUND_ACTIVITY_RE = /^(.+)-r(\d+)(?:-|$)/;

/** WCA Round#round_type_id from number, total rounds, and cutoff presence. */
export function roundTypeIdFromWcif(
  number: number,
  totalRounds: number,
  hasCutoff: boolean,
): string {
  if (number === totalRounds) {
    return hasCutoff ? "c" : "f";
  }
  if (number === 1) {
    return hasCutoff ? "d" : "1";
  }
  if (number === 2) {
    return hasCutoff ? "e" : "2";
  }
  return hasCutoff ? "g" : "3";
}

export function parseRoundActivityCode(
  code: string,
): { eventId: string; roundNumber: number } | null {
  const match = ROUND_ACTIVITY_RE.exec(code);
  if (!match?.[1] || match[2] === undefined) {
    return null;
  }
  return { eventId: match[1], roundNumber: Number(match[2]) };
}

/** Local calendar date YYYY-MM-DD in the venue timezone. */
export function toLocalDateKey(
  isoDateTime: string,
  timeZone: string,
): string | null {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    // Invalid IANA zone — fall back to UTC date
    return date.toISOString().slice(0, 10);
  }
}

function walkActivities(
  activities: WcifActivity[] | undefined,
  timeZone: string,
  acc: Map<string, string>,
) {
  if (!activities) return;

  for (const activity of activities) {
    const parsed = parseRoundActivityCode(activity.activityCode);
    if (parsed && activity.endTime) {
      const localDate = toLocalDateKey(activity.endTime, timeZone);
      if (localDate) {
        const key = `${parsed.eventId}\0${parsed.roundNumber}`;
        const prev = acc.get(key);
        if (!prev || localDate > prev) {
          acc.set(key, localDate);
        }
      }
    }
    walkActivities(activity.childActivities, timeZone, acc);
  }
}

/**
 * Build round_type_id map from WCIF events[].rounds, then attach latest local
 * end dates from schedule activities (max across venues/rooms/groups).
 */
export function extractRoundEndDatesFromWcif(
  wcif: WcifLike | null | undefined,
): RoundEndDateRow[] {
  if (!wcif?.schedule?.venues?.length || !wcif.events?.length) {
    return [];
  }

  /** eventId\0roundNumber → roundTypeId */
  const roundTypeByKey = new Map<string, string>();

  for (const event of wcif.events) {
    const rounds = event.rounds ?? [];
    const total = rounds.length;
    if (total === 0) continue;

    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i]!;
      const parsed = parseRoundActivityCode(round.id);
      const roundNumber = parsed?.roundNumber ?? i + 1;
      const hasCutoff = round.cutoff != null;
      const roundTypeId = roundTypeIdFromWcif(roundNumber, total, hasCutoff);
      roundTypeByKey.set(`${event.id}\0${roundNumber}`, roundTypeId);
    }
  }

  /** eventId\0roundNumber → latest local end date */
  const endDateByKey = new Map<string, string>();

  for (const venue of wcif.schedule.venues) {
    const timeZone = venue.timezone?.trim() || "UTC";
    for (const room of venue.rooms ?? []) {
      walkActivities(room.activities, timeZone, endDateByKey);
    }
  }

  const out: RoundEndDateRow[] = [];

  for (const [key, endDate] of endDateByKey) {
    const roundTypeId = roundTypeByKey.get(key);
    if (!roundTypeId) continue;
    const [eventId] = key.split("\0");
    if (!eventId) continue;
    out.push({ eventId, roundTypeId, endDate });
  }

  // If the same round_type_id appears twice (shouldn't), keep latest endDate
  const byRound = new Map<string, RoundEndDateRow>();
  for (const row of out) {
    const k = `${row.eventId}\0${row.roundTypeId}`;
    const prev = byRound.get(k);
    if (!prev || row.endDate > prev.endDate) {
      byRound.set(k, row);
    }
  }

  return [...byRound.values()].sort((a, b) => {
    if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
    return a.roundTypeId.localeCompare(b.roundTypeId);
  });
}
