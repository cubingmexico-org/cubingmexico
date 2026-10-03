import "server-only";

import { db } from "@workspace/db";
import { competition, state } from "@workspace/db/schema";
import { accentInsensitiveContains } from "@/lib/search";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

export async function getMexicanCompetitions({
  missingStateOnly,
  missingLogoOnly,
  missingScheduleOnly,
  stateId,
  search,
  limit = 100,
}: {
  missingStateOnly?: boolean;
  missingLogoOnly?: boolean;
  missingScheduleOnly?: boolean;
  stateId?: string | null;
  search?: string;
  limit?: number;
}) {
  const filters = [eq(competition.countryId, "Mexico")];

  if (missingStateOnly) {
    filters.push(isNull(competition.stateId));
  }

  if (missingLogoOnly) {
    filters.push(isNull(competition.logo));
  }

  if (missingScheduleOnly) {
    filters.push(
      sql`EXISTS (SELECT 1 FROM results r WHERE r.competition_id = ${competition.id})`,
    );
    filters.push(
      sql`NOT EXISTS (
        SELECT 1 FROM competition_round_dates d
        WHERE d.competition_id = ${competition.id}
      )`,
    );
  }

  if (stateId) {
    filters.push(eq(competition.stateId, stateId));
  }

  const term = search?.trim();
  if (term) {
    filters.push(
      or(
        accentInsensitiveContains(competition.name, term),
        accentInsensitiveContains(competition.id, term),
        accentInsensitiveContains(competition.cityName, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
      startDate: competition.startDate,
      stateId: competition.stateId,
      stateName: state.name,
      logo: competition.logo,
      information: competition.information,
      hasResults: sql<boolean>`EXISTS (
        SELECT 1 FROM results r WHERE r.competition_id = ${competition.id}
      )`,
      hasSchedule: sql<boolean>`EXISTS (
        SELECT 1 FROM competition_round_dates d
        WHERE d.competition_id = ${competition.id}
      )`,
      scheduleSource: sql<"wcif" | "manual" | null>`(
        SELECT d.source
        FROM competition_round_dates d
        WHERE d.competition_id = ${competition.id}
        ORDER BY CASE WHEN d.source = 'manual' THEN 0 ELSE 1 END
        LIMIT 1
      )`,
    })
    .from(competition)
    .leftJoin(state, eq(competition.stateId, state.id))
    .where(and(...filters))
    .orderBy(desc(competition.startDate))
    .limit(limit);

  const { informationHasExtractableLogo } =
    await import("@/lib/competition-logo");

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cityName: row.cityName,
    startDate: row.startDate,
    stateId: row.stateId,
    stateName: row.stateName,
    logo: row.logo,
    hasExtractableLogo: informationHasExtractableLogo(row.information),
    hasResults: Boolean(row.hasResults),
    hasSchedule: Boolean(row.hasSchedule),
    scheduleSource: row.scheduleSource,
  }));
}

export async function getCompetitionsMissingSchedules({
  search,
  limit = 100,
}: {
  search?: string;
  limit?: number;
}) {
  const filters = [
    sql`EXISTS (SELECT 1 FROM results r WHERE r.competition_id = ${competition.id})`,
    sql`NOT EXISTS (
      SELECT 1 FROM competition_round_dates d
      WHERE d.competition_id = ${competition.id}
    )`,
  ];

  const term = search?.trim();
  if (term) {
    filters.push(
      or(
        accentInsensitiveContains(competition.name, term),
        accentInsensitiveContains(competition.id, term),
        accentInsensitiveContains(competition.cityName, term),
      )!,
    );
  }

  const rows = await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
      countryId: competition.countryId,
      startDate: competition.startDate,
    })
    .from(competition)
    .where(and(...filters))
    .orderBy(desc(competition.startDate))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    hasResults: true,
    hasSchedule: false,
    scheduleSource: null as "wcif" | "manual" | null,
  }));
}
