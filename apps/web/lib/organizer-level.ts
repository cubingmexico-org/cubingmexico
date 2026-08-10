import { sql, type SQL } from "drizzle-orm";
import { competition, competitionOrganizer } from "@workspace/db/schema";

export const ORGANIZER_LEVELS = [
  "Debutante",
  "Super",
  "Experto",
  "Experta",
  "Maestro",
  "Maestra",
  "Leyenda",
  "Inactivo",
  "Inactiva",
] as const;

export type OrganizerLevel = (typeof ORGANIZER_LEVELS)[number];

export const ORGANIZER_LEVEL_FILTERS = [
  "Debutante",
  "Super",
  "Experto",
  "Maestro",
  "Leyenda",
  "Inactivo",
] as const;

export type OrganizerLevelFilter = (typeof ORGANIZER_LEVEL_FILTERS)[number];

export const AMS_ORGANIZER_EXPERIENCE_TABLE_URL =
  "https://docs.google.com/spreadsheets/d/1JrbT94RB9VpDiCdHmGtC-mJeE4Mux6bh/edit?usp=sharing&ouid=116673815176459806406&rtpof=true&sd=true";

/** Distinct organized competitions whose start_date is within the last 2 years. */
export function recentOrganizedCompetitionCountSql(): SQL<number> {
  return sql<number>`COUNT(DISTINCT CASE
    WHEN ${competition.startDate} >= NOW() - INTERVAL '2 years'
    THEN ${competitionOrganizer.competitionId}
  END)`;
}

export function getOrganizerLevelFilterOptions(
  levelCounts: Partial<Record<OrganizerLevelFilter, number>>,
) {
  return ORGANIZER_LEVEL_FILTERS.map((level, sortIndex) => ({
    label: level,
    value: level,
    count: levelCounts[level] ?? 0,
    sortIndex,
  }));
}

export function toOrganizerLevelFilter(
  level: OrganizerLevel,
): OrganizerLevelFilter {
  if (level === "Experta") return "Experto";
  if (level === "Maestra") return "Maestro";
  if (level === "Inactiva") return "Inactivo";
  return level;
}

export function getOrganizerLevel(
  competitionCount: number,
  gender: string | null,
): OrganizerLevel {
  const isFemale = gender === "f";

  if (competitionCount === 0) {
    return isFemale ? "Inactiva" : "Inactivo";
  }
  if (competitionCount === 1) {
    return "Debutante";
  }
  if (competitionCount === 2) {
    return "Super";
  }
  if (competitionCount <= 4) {
    return isFemale ? "Experta" : "Experto";
  }
  if (competitionCount === 5) {
    return isFemale ? "Maestra" : "Maestro";
  }
  return "Leyenda";
}

export function organizerLevelSql(
  competitionCountExpr: SQL,
  genderExpr: SQL,
): SQL<string> {
  return sql<string>`CASE
    WHEN ${competitionCountExpr} = 0 THEN CASE WHEN ${genderExpr} = 'f' THEN 'Inactiva' ELSE 'Inactivo' END
    WHEN ${competitionCountExpr} = 1 THEN 'Debutante'
    WHEN ${competitionCountExpr} = 2 THEN 'Super'
    WHEN ${competitionCountExpr} <= 4 THEN CASE WHEN ${genderExpr} = 'f' THEN 'Experta' ELSE 'Experto' END
    WHEN ${competitionCountExpr} = 5 THEN CASE WHEN ${genderExpr} = 'f' THEN 'Maestra' ELSE 'Maestro' END
    ELSE 'Leyenda'
  END`;
}

export function organizerLevelFilterSql(
  competitionCountExpr: SQL,
): SQL<string> {
  return sql<string>`CASE
    WHEN ${competitionCountExpr} = 0 THEN 'Inactivo'
    WHEN ${competitionCountExpr} = 1 THEN 'Debutante'
    WHEN ${competitionCountExpr} = 2 THEN 'Super'
    WHEN ${competitionCountExpr} <= 4 THEN 'Experto'
    WHEN ${competitionCountExpr} = 5 THEN 'Maestro'
    ELSE 'Leyenda'
  END`;
}
