import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  canShowGoalsLinks,
  getEditableGoalYear,
  isAnnualSummaryPubliclyUnlocked,
} from "./summary-year";

/**
 * Server-only gate for annual summary pages/links.
 * Public after current-year unlock (Dec 20 UTC); until then, superadmins only.
 * After public unlock, remove the superadmin branch — it becomes a no-op.
 *
 * Reads session (request data) before `new Date()` so Next.js prerender allows
 * current-time access — see next-prerender-current-time.
 */
export async function canAccessAnnualSummary(now?: Date): Promise<boolean> {
  const wcaId = await getSessionUserId();
  const current = now ?? new Date();
  if (isAnnualSummaryPubliclyUnlocked(current)) {
    return true;
  }
  return isSuperadmin(wcaId);
}

/** Server-only gate for the goals page and goal sections (see `canShowGoalsLinks`). */
export async function canAccessGoals(now?: Date): Promise<boolean> {
  const wcaId = await getSessionUserId();
  return canShowGoalsLinks(isSuperadmin(wcaId), now ?? new Date());
}

/**
 * Server-only: the goal year the signed-in person can edit right now, or null.
 * Superadmins can edit next year's goals before the public unlock.
 */
export async function getSessionEditableGoalYear(
  now?: Date,
): Promise<number | null> {
  const wcaId = await getSessionUserId();
  return getEditableGoalYear(now ?? new Date(), isSuperadmin(wcaId));
}

/** Server-only: whether the signed-in person can create or edit goals for `year`. */
export async function canEditGoals(year: number, now?: Date): Promise<boolean> {
  return (await getSessionEditableGoalYear(now)) === year;
}
