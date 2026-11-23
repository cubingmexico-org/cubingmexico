import "server-only";

import { wcaFetch } from "@workspace/wca";
import { parseScoretakingSoftware } from "./urls";
import type {
  LiveCompetitionMeta,
  LiveRoundDetails,
  LiveRoundsResponse,
} from "./types";

export type { LiveCompetitionMeta };

export async function fetchLiveCompetitionMeta(
  competitionId: string,
): Promise<LiveCompetitionMeta | null> {
  const response = await wcaFetch(`/api/v0/competitions/${competitionId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch competition ${competitionId}: ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    id: string;
    name: string;
    scoretaking_software?: unknown;
    start_date?: string;
    end_date?: string;
    city?: string;
    venue?: string;
  };

  return {
    id: data.id,
    name: data.name,
    scoretakingSoftware: parseScoretakingSoftware(data.scoretaking_software),
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    city: data.city ?? null,
    venue: data.venue ?? null,
  };
}

/** WCA returns these when ILR live data is missing or not public yet. */
function isLiveUnavailable(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

export async function fetchLiveRounds(
  competitionId: string,
): Promise<LiveRoundsResponse> {
  const response = await wcaFetch(
    `/api/v1/competitions/${competitionId}/live/rounds`,
    { cache: "no-store" },
  );

  if (isLiveUnavailable(response.status)) {
    return { rounds: [] };
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch live rounds for ${competitionId}: ${response.status}`,
    );
  }

  return response.json() as Promise<LiveRoundsResponse>;
}

export async function fetchLiveRoundDetails(
  competitionId: string,
  roundId: string,
): Promise<LiveRoundDetails | null> {
  const response = await wcaFetch(
    `/api/v1/competitions/${competitionId}/live/rounds/${encodeURIComponent(roundId)}`,
    { cache: "no-store" },
  );

  if (isLiveUnavailable(response.status)) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch live round ${roundId} for ${competitionId}: ${response.status}`,
    );
  }

  return response.json() as Promise<LiveRoundDetails>;
}
