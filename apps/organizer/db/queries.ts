import type { WCIF } from "@/types/wcif";
import type { Competition } from "@/types/wca";
import { wcifLatestUrl } from "@/lib/wcif-api";
import { reportError } from "@/lib/report-error";
import { db } from "@workspace/db";
import {
  competition as competitionTable,
  person as personTable,
  state as stateTable,
  team as teamTable,
  type Team,
} from "@workspace/db/schema";
import { wcaFetch } from "@workspace/wca";
import { eq, inArray } from "drizzle-orm";

function wcaError(what: string, res: Response): Error {
  return new Error(`WCA API responded ${res.status} for ${what}`);
}

/**
 * Competitions the signed-in user manages. Throws when the WCA call fails, so the
 * error page shows instead of an empty list.
 */
export async function getCompetitionsManagedByUser({
  token,
}: {
  token: string | undefined;
}): Promise<Competition[]> {
  if (!token) {
    return [];
  }

  const res = await wcaFetch("/api/v0/competitions?managed_by_me=true", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw wcaError("managed competitions", res);
  }

  return (await res.json()) as Competition[];
}

/**
 * WCIF of a competition, or `undefined` when the WCA doesn't have one we can read
 * (404, 401, 403). Throws on other failures (429, 5xx, timeouts).
 */
export async function getWCIFByCompetitionId({
  competitionId,
}: {
  competitionId: string;
}): Promise<WCIF | undefined> {
  const res = await wcaFetch(wcifLatestUrl(competitionId), {
    next: {
      tags: [`wcif-${competitionId}`],
    },
  });

  if ([401, 403, 404].includes(res.status)) {
    return undefined;
  }
  if (!res.ok) {
    throw wcaError(`the WCIF of ${competitionId}`, res);
  }

  return (await res.json()) as WCIF;
}

/** WCA competition, or `undefined` when it doesn't exist. Throws on other failures. */
export async function getCompetitionById({
  id,
}: {
  id: string;
}): Promise<Competition | undefined> {
  const res = await wcaFetch(`/api/v0/competitions/${encodeURIComponent(id)}`);

  if (res.status === 404) {
    return undefined;
  }
  if (!res.ok) {
    throw wcaError(`competition ${id}`, res);
  }

  return (await res.json()) as Competition;
}

/** Cubing México `competitions.logo` from Neon (may be null). */
export async function getCompetitionLogoById(
  competitionId: string,
): Promise<string | null> {
  try {
    const row = await db.query.competition.findFirst({
      where: eq(competitionTable.id, competitionId),
      columns: { logo: true },
    });
    const logo = row?.logo?.trim();
    return logo || null;
  } catch (error) {
    // The logo is decorative: render without it, but still report the failure.
    reportError(error, { competitionId });
    return null;
  }
}

/** Batch-fetch Neon logos for home cards (avoids N+1). */
export async function getCompetitionLogosByIds(
  competitionIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (competitionIds.length === 0) {
    return map;
  }

  for (const id of competitionIds) {
    map.set(id, null);
  }

  try {
    const rows = await db
      .select({
        id: competitionTable.id,
        logo: competitionTable.logo,
      })
      .from(competitionTable)
      .where(inArray(competitionTable.id, competitionIds));

    for (const row of rows) {
      const logo = row.logo?.trim();
      map.set(row.id, logo || null);
    }
  } catch (error) {
    reportError(error);
  }

  return map;
}

export type { Team };

export async function getTeams(): Promise<Team[]> {
  return await db.select().from(teamTable);
}

export interface State {
  id: string;
  name: string;
}

export async function getStates(): Promise<State[]> {
  return await db
    .select({ id: stateTable.id, name: stateTable.name })
    .from(stateTable);
}

export async function getCompetitorStates(
  wcaIds: string[],
): Promise<{ wcaId: string; stateId: string | null }[]> {
  if (wcaIds.length === 0) {
    return [];
  }

  return await db
    .select({ wcaId: personTable.wcaId, stateId: personTable.stateId })
    .from(personTable)
    .where(inArray(personTable.wcaId, wcaIds));
}
