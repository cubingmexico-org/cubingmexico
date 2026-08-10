/** Current-year summaries unlock on this UTC day-of-month in December. */
export const CURRENT_YEAR_SUMMARY_UNLOCK_DAY = 20;

/**
 * Past years are always published. The current calendar year only becomes
 * available in the last days of December (from the 20th UTC onward).
 */
export function isSummaryYearPublished(
  year: number,
  now: Date = new Date(),
): boolean {
  const currentYear = now.getUTCFullYear();
  if (year < currentYear) return true;
  if (year > currentYear) return false;

  const month = now.getUTCMonth(); // 0-indexed
  const day = now.getUTCDate();
  return month === 11 && day >= CURRENT_YEAR_SUMMARY_UNLOCK_DAY;
}

/** Default year for entry points (e.g. user dropdown). */
export function getDefaultSummaryYear(now: Date = new Date()): number {
  const currentYear = now.getUTCFullYear();
  return isSummaryYearPublished(currentYear, now)
    ? currentYear
    : currentYear - 1;
}
