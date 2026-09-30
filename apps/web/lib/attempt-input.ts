import { encodeMultiBlind, type ResultValueType } from "@/lib/utils";

export type AttemptInputResult = number | null | "invalid";

export type WhatIfOverrides = {
  singles: Record<string, number | null>;
  averages: Record<string, number | null>;
};

const MBLD_UNKNOWN_TIME = 99999;

function parseClockParts(text: string): number[] | null {
  const parts = text.split(":");
  if (parts.length > 3) return null;
  const numbers = parts.map((part) =>
    /^\d+$/.test(part) ? Number(part) : NaN,
  );
  return numbers.some(Number.isNaN) ? null : numbers;
}

function parseCentiseconds(text: string): AttemptInputResult {
  const parts = text.split(":");
  if (parts.length > 3) return "invalid";

  const last = parts.pop()!;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(last);
  if (!match) return "invalid";

  const leading = parseClockParts(parts.join(":") || "0");
  if (!leading) return "invalid";

  const seconds = Number(match[1]);
  const hundredths = Number((match[2] ?? "").padEnd(2, "0"));
  const leadingSeconds = leading.reduce((acc, n) => acc * 60 + n, 0) * 60;
  const total = (leadingSeconds + seconds) * 100 + hundredths;
  return total > 0 ? total : "invalid";
}

function parseMultiBlind(text: string): AttemptInputResult {
  const match = /^(\d+)\s*\/\s*(\d+)(?:\s+(\S+))?$/.exec(text);
  if (!match) return "invalid";

  const solved = Number(match[1]);
  const attempted = Number(match[2]);
  const missed = attempted - solved;
  if (attempted < 2 || solved > attempted || solved - missed <= 0) {
    return "invalid";
  }

  let timeInSeconds = MBLD_UNKNOWN_TIME;
  if (match[3]) {
    const parts = parseClockParts(match[3]);
    if (!parts || parts.length < 2) return "invalid";
    timeInSeconds = parts.reduce((acc, n) => acc * 60 + n, 0);
    if (timeInSeconds <= 0 || timeInSeconds >= MBLD_UNKNOWN_TIME) {
      return "invalid";
    }
  }

  return encodeMultiBlind({ solved, attempted, timeInSeconds });
}

/**
 * Parse user input for a single/average into a WCA-encoded value.
 * Returns `null` for an empty input (no record).
 */
export function parseAttemptInput(
  eventId: string,
  type: ResultValueType,
  text: string,
): AttemptInputResult {
  const value = text.trim();
  if (value === "") return null;

  if (eventId === "333mbf") {
    return type === "single" ? parseMultiBlind(value) : "invalid";
  }

  if (eventId === "333fm") {
    if (type === "single") {
      return /^\d+$/.test(value) && Number(value) > 0
        ? Number(value)
        : "invalid";
    }
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) return "invalid";
    const total =
      Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
    return total > 0 ? total : "invalid";
  }

  return parseCentiseconds(value);
}

export function hasAverage(eventId: string) {
  return eventId !== "333mbf";
}

export function whatIfParamKey(type: ResultValueType, eventId: string) {
  return `${type === "single" ? "s" : "a"}.${eventId}`;
}

/**
 * Read `s.<eventId>` / `a.<eventId>` search params. An empty value removes the
 * record; unknown events and malformed values are ignored.
 */
export function parseWhatIfParams(
  params: Record<string, string | string[] | undefined>,
  eventIds: readonly string[],
): WhatIfOverrides {
  const overrides: WhatIfOverrides = { singles: {}, averages: {} };

  for (const eventId of eventIds) {
    for (const type of ["single", "average"] as const) {
      if (type === "average" && !hasAverage(eventId)) continue;
      const raw = params[whatIfParamKey(type, eventId)];
      if (typeof raw !== "string") continue;

      const target = type === "single" ? overrides.singles : overrides.averages;
      if (raw === "") {
        target[eventId] = null;
      } else if (/^\d+$/.test(raw) && Number(raw) > 0) {
        target[eventId] = Number(raw);
      }
    }
  }

  return overrides;
}

function applyValues(
  real: Record<string, number>,
  overrides: Record<string, number | null>,
): Record<string, number> {
  const merged = { ...real };
  for (const [eventId, value] of Object.entries(overrides)) {
    if (value === null) {
      delete merged[eventId];
    } else {
      merged[eventId] = value;
    }
  }
  return merged;
}

export function applyWhatIfOverrides(
  real: { singles: Record<string, number>; averages: Record<string, number> },
  overrides: WhatIfOverrides,
) {
  return {
    singles: applyValues(real.singles, overrides.singles),
    averages: applyValues(real.averages, overrides.averages),
  };
}

export function hasOverrides(overrides: WhatIfOverrides) {
  return (
    Object.keys(overrides.singles).length > 0 ||
    Object.keys(overrides.averages).length > 0
  );
}
