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

/**
 * True once this calendar year's summaries are public (Dec 20 UTC+).
 * Temporary feature gate: after unlock, drop superadmin preview and always show entry points.
 */
export function isAnnualSummaryPubliclyUnlocked(
  now: Date = new Date(),
): boolean {
  return isSummaryYearPublished(now.getUTCFullYear(), now);
}

/** Goals for a year stay editable until this UTC day of that year's January. */
export const GOALS_EDIT_DEADLINE_DAY = 31;

/**
 * The year whose goals can be created or edited right now: next year once
 * this year's summary unlocks (Dec 20 UTC), the current year until Jan 31 UTC,
 * and none in between. `preview` (superadmins) opens next year's goals early.
 */
export function getEditableGoalYear(
  now: Date = new Date(),
  preview = false,
): number | null {
  const currentYear = now.getUTCFullYear();
  if (isSummaryYearPublished(currentYear, now)) return currentYear + 1;
  if (now.getUTCMonth() === 0 && now.getUTCDate() <= GOALS_EDIT_DEADLINE_DAY) {
    return currentYear;
  }
  return preview ? currentYear + 1 : null;
}

/** True once the goal year is over, so its goals have a final outcome. */
export function isGoalYearClosed(
  year: number,
  now: Date = new Date(),
): boolean {
  return now.getUTCFullYear() > year;
}

/**
 * Custom goals can be marked done during their year and through the next
 * January, so goals finished in late December can still be checked off.
 */
export function canCompleteGoalYear(
  year: number,
  now: Date = new Date(),
): boolean {
  const currentYear = now.getUTCFullYear();
  if (year === currentYear) return true;
  return year === currentYear - 1 && getEditableGoalYear(now) === currentYear;
}

/** The first year people can set goals for; the feature opens with the previous year's summaries. */
export const GOALS_FIRST_YEAR = 2027;

/**
 * Client-safe: goals open to everyone with the GOALS_FIRST_YEAR - 1 summaries
 * and then stay available all year; superadmins see them early.
 */
export function canShowGoalsLinks(
  isSuperadmin: boolean,
  now: Date = new Date(),
): boolean {
  return (
    isSuperadmin ||
    now.getUTCFullYear() > GOALS_FIRST_YEAR - 1 ||
    isSummaryYearPublished(GOALS_FIRST_YEAR - 1, now)
  );
}

/** Client-safe: public unlock or early superadmin preview. */
export function canShowAnnualSummaryLinks(
  isSuperadmin: boolean,
  now: Date = new Date(),
): boolean {
  return isAnnualSummaryPubliclyUnlocked(now) || isSuperadmin;
}
