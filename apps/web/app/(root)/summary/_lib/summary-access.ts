import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { isAnnualSummaryPubliclyUnlocked } from "./summary-year";

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
