import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { isAnnualSummaryPubliclyUnlocked } from "./summary-year";

/**
 * Server-only gate for annual summary pages/links.
 * Public after current-year unlock (Dec 20 UTC); until then, superadmins only.
 * After public unlock, remove the superadmin branch — it becomes a no-op.
 */
export async function canAccessAnnualSummary(
  now: Date = new Date(),
): Promise<boolean> {
  if (isAnnualSummaryPubliclyUnlocked(now)) {
    return true;
  }
  const wcaId = await getSessionUserId();
  return isSuperadmin(wcaId);
}
