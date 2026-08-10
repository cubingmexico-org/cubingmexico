import { unauthorized } from "next/navigation";
import { getSessionUserId } from "@/lib/team-auth";

function parseSuperadminIds(): Set<string> {
  const raw = process.env.SUPERADMIN_WCA_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isSuperadmin(wcaId: string | null | undefined): boolean {
  if (!wcaId) {
    return false;
  }
  return parseSuperadminIds().has(wcaId);
}

export async function requireSuperadmin(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    unauthorized();
  }
  return userId;
}
