import type { WCIF } from "@/types/wcif";
import type { Competition } from "@/types/wca";
import { wcifLatestUrl } from "@/lib/wcif-api";
import { db } from "@workspace/db";
import {
  competition as competitionTable,
  person as personTable,
  state as stateTable,
  team as teamTable,
  type Team,
} from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getCompetitionsManagedByUser({
  token,
}: {
  token: string | undefined;
}): Promise<Competition[]> {
  try {
    const res = await fetch(
      "https://www.worldcubeassociation.org/api/v0/competitions?managed_by_me=true",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return [];
  }
}

export async function getWCIFByCompetitionId({
  competitionId,
}: {
  competitionId: string;
}): Promise<WCIF | undefined> {
  try {
    const res = await fetch(wcifLatestUrl(competitionId), {
      next: {
        tags: [`wcif-${competitionId}`],
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching competition:", error);
    return undefined;
  }
}

export async function getCompetitionById({
  id,
}: {
  id: string;
}): Promise<Competition | undefined> {
  try {
    const res = await fetch(
      `https://www.worldcubeassociation.org/api/v0/competitions/${id}`,
    );

    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching location:", error);
    return undefined;
  }
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
    console.error("Error fetching competition logo:", error);
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

  try {
    const rows = await db
      .select({
        id: competitionTable.id,
        logo: competitionTable.logo,
      })
      .from(competitionTable)
      .where(inArray(competitionTable.id, competitionIds));

    for (const id of competitionIds) {
      map.set(id, null);
    }
    for (const row of rows) {
      const logo = row.logo?.trim();
      map.set(row.id, logo || null);
    }
  } catch (error) {
    console.error("Error fetching competition logos:", error);
    for (const id of competitionIds) {
      map.set(id, null);
    }
  }

  return map;
}

export type { Team };

export async function getTeams(): Promise<Team[]> {
  try {
    return await db.select().from(teamTable);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
}

export interface State {
  id: string;
  name: string;
}

export async function getStates(): Promise<State[]> {
  try {
    return await db
      .select({ id: stateTable.id, name: stateTable.name })
      .from(stateTable);
  } catch (error) {
    console.error("Error fetching states:", error);
    return [];
  }
}

export async function getCompetitorStates(
  wcaIds: string[],
): Promise<{ wcaId: string; stateId: string | null }[]> {
  if (wcaIds.length === 0) {
    return [];
  }

  try {
    return await db
      .select({ wcaId: personTable.wcaId, stateId: personTable.stateId })
      .from(personTable)
      .where(inArray(personTable.wcaId, wcaIds));
  } catch (error) {
    console.error("Error fetching competitor states:", error);
    return [];
  }
}
