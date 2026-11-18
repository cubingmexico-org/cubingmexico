import { formatTime } from "@/lib/utils";

const MAX_DIGITS = 8;

/**
 * Parse a digit-pad time string (e.g. "4534" → 45.34, "23454" → 2:34.54).
 * Digits are read from the right as …mmsscc. Returns null for empty input,
 * and "invalid" when the seconds chunk is ≥ 60.
 */
export function digitsToCentiseconds(
  digits: string,
): number | null | "invalid" {
  if (digits === "") return null;
  if (!/^\d+$/.test(digits)) return "invalid";

  const padded = digits.padStart(4, "0");
  const centiseconds = Number(padded.slice(-2));
  const seconds = Number(padded.slice(-4, -2));
  const minutes = Number(padded.slice(0, -4) || "0");

  if (seconds >= 60) return "invalid";

  return (minutes * 60 + seconds) * 100 + centiseconds;
}

/**
 * Format digit-pad input for display, including invalid seconds (e.g. "9:99.99").
 */
export function formatDigitsDisplay(digits: string): string {
  if (digits === "") return "";
  const padded = digits.padStart(4, "0");
  const cs = padded.slice(-2);
  const sec = padded.slice(-4, -2);
  const min = padded.slice(0, -4);
  if (min === "" || min === "0") {
    return `${Number(sec)}.${cs}`;
  }
  return `${Number(min)}:${sec}.${cs}`;
}

/** Keep only digits, capped for digit-pad fields. */
export function sanitizeDigitInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

/** Format centiseconds for digit-pad display (same as formatTime). */
export function formatDigitTime(centiseconds: number): string {
  return formatTime(centiseconds);
}

/**
 * Remaining time under a cumulative limit.
 * Empty/invalid limit → null (caller shows "--.--").
 * Clamps below zero to 0.
 */
export function remainingCentiseconds(
  limitDigits: string,
  attemptDigits: string[],
): number | null {
  const limit = digitsToCentiseconds(limitDigits);
  if (limit === null || limit === "invalid") return null;

  let used = 0;
  for (const digits of attemptDigits) {
    const value = digitsToCentiseconds(digits);
    if (value === null) continue;
    if (value === "invalid") return null;
    used += value;
  }

  return Math.max(0, limit - used);
}
