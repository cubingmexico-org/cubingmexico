import { parseAsBoolean, parseAsStringLiteral } from "nuqs/server";

/** `?deprecated=true` adds deprecated events (333ft, magic, ...) to counts and ranks. */
export const deprecatedParser = parseAsBoolean.withDefault(false);

export const STATS_WINDOWS = ["2y", "all"] as const;
export type StatsWindow = (typeof STATS_WINDOWS)[number];

/** `?window=all` switches windowed stats from the last 2 years to all-time. */
export const statsWindowParser =
  parseAsStringLiteral(STATS_WINDOWS).withDefault("2y");
