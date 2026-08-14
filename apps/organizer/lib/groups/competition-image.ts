import type { CompetitionConfig } from "@/lib/groups/config";

/**
 * Resolve scorecard background from config mode + competition logo.
 */
export function resolveScorecardsBackgroundUrl(
  config: Pick<
    CompetitionConfig,
    "scorecardsBackgroundMode" | "scorecardsBackgroundUrl"
  >,
  competitionLogoUrl: string | null | undefined,
): string | null {
  const mode = config.scorecardsBackgroundMode ?? "competition";
  if (mode === "none") return null;
  if (mode === "custom") {
    const custom = config.scorecardsBackgroundUrl?.trim() ?? "";
    return custom || null;
  }
  const fromComp = competitionLogoUrl?.trim() ?? "";
  return fromComp || null;
}
