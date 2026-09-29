import { eventNames } from "@/lib/constants";
import {
  parseRoundActivityCode,
  type WcifLike,
} from "@/lib/competition-round-dates";

export type CalendarEvent = {
  uid: string;
  title: string;
  location?: string;
  description?: string;
  url?: string;
} & (
  | { allDay: true; startDate: string; endDate: string } // YYYY-MM-DD, inclusive
  | { allDay: false; start: string; end: string } // ISO date-times
);

export type CalendarCompetition = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  venue_address: string;
  url: string;
};

const SITE_URL = "https://www.cubingmexico.net";

/** WCA venue names may contain markdown links like `[Name](url)`. */
export function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
}

export function competitionLocation(competition: CalendarCompetition): string {
  return [stripMarkdownLinks(competition.venue), competition.venue_address]
    .filter(Boolean)
    .join(", ");
}

export function competitionPageUrl(competitionId: string): string {
  return `${SITE_URL}/competitions/${competitionId}`;
}

function toCompactDate(date: string): string {
  return date.slice(0, 10).replaceAll("-", "");
}

function addOneDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toIcsDateTime(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function buildGoogleCalendarUrl({
  title,
  startDate,
  endDate,
  location,
  details,
}: {
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  details?: string;
}): string {
  // Google treats the end date of all-day events as exclusive.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toCompactDate(startDate)}/${toCompactDate(addOneDay(endDate))}`,
  });
  if (location) params.set("location", location);
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function competitionAllDayEvent(
  competition: CalendarCompetition,
): CalendarEvent {
  return {
    uid: `${competition.id}@cubingmexico.net`,
    title: competition.name,
    allDay: true,
    startDate: competition.start_date,
    endDate: competition.end_date,
    location: competitionLocation(competition),
    description: `${competition.url}\n${competitionPageUrl(competition.id)}`,
    url: competitionPageUrl(competition.id),
  };
}

type WcifScheduleActivity = {
  id?: number;
  name?: string;
  activityCode: string;
  startTime?: string;
  endTime?: string;
};

type WcifSchedule = {
  events?: WcifLike["events"];
  schedule?: {
    venues?: {
      name?: string;
      rooms?: { name?: string; activities?: WcifScheduleActivity[] }[];
    }[];
  };
};

function activityTitle(
  activity: WcifScheduleActivity,
  roundCounts: Map<string, number>,
): string {
  const parsed = parseRoundActivityCode(activity.activityCode);
  if (parsed) {
    const eventName = eventNames[parsed.eventId] ?? parsed.eventId;
    const total = roundCounts.get(parsed.eventId);
    const round =
      total !== undefined && parsed.roundNumber === total && total > 0
        ? "Final"
        : `Ronda ${parsed.roundNumber}`;
    return `${eventName} - ${round}`;
  }
  return activity.name?.trim() || activity.activityCode;
}

/**
 * Top-level WCIF schedule activities (groups are skipped) as calendar events.
 * Falls back to one all-day event when the WCIF has no usable schedule.
 */
export function wcifToCalendarEvents(
  wcif: unknown,
  competition: CalendarCompetition,
): CalendarEvent[] {
  const data = wcif as WcifSchedule | null | undefined;
  const venues = data?.schedule?.venues ?? [];

  const roundCounts = new Map<string, number>();
  for (const event of data?.events ?? []) {
    roundCounts.set(event.id, event.rounds?.length ?? 0);
  }

  const location = competitionLocation(competition);
  const pageUrl = competitionPageUrl(competition.id);
  const byKey = new Map<
    string,
    { activity: WcifScheduleActivity; rooms: Set<string> }
  >();

  for (const venue of venues) {
    for (const room of venue.rooms ?? []) {
      for (const activity of room.activities ?? []) {
        if (!activity.startTime || !activity.endTime) continue;
        const key = `${activity.activityCode}|${activity.startTime}|${activity.endTime}`;
        const entry = byKey.get(key) ?? { activity, rooms: new Set<string>() };
        if (room.name) entry.rooms.add(room.name);
        byKey.set(key, entry);
      }
    }
  }

  if (byKey.size === 0) {
    return [competitionAllDayEvent(competition)];
  }

  return [...byKey.values()]
    .sort((a, b) => a.activity.startTime!.localeCompare(b.activity.startTime!))
    .map(({ activity, rooms }, index) => {
      const roomLine = rooms.size > 0 ? `Sala: ${[...rooms].join(", ")}\n` : "";
      return {
        uid: `${competition.id}-${activity.activityCode}-${toIcsDateTime(activity.startTime!)}-${index}@cubingmexico.net`,
        title: `${activityTitle(activity, roundCounts)} · ${competition.name}`,
        allDay: false,
        start: activity.startTime!,
        end: activity.endTime!,
        location,
        description: `${roomLine}${competition.url}\n${pageUrl}`,
        url: pageUrl,
      };
    });
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** RFC 5545 line folding: max 75 octets per line, continuation lines start with a space. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(
  events: CalendarEvent[],
  calendarName?: string,
): string {
  const stamp = toIcsDateTime(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cubing México//Competencias//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (calendarName) lines.push(`X-WR-CALNAME:${escapeIcsText(calendarName)}`);

  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${stamp}`);
    if (event.allDay) {
      lines.push(
        `DTSTART;VALUE=DATE:${toCompactDate(event.startDate)}`,
        `DTEND;VALUE=DATE:${toCompactDate(addOneDay(event.endDate))}`,
      );
    } else {
      lines.push(
        `DTSTART:${toIcsDateTime(event.start)}`,
        `DTEND:${toIcsDateTime(event.end)}`,
      );
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
