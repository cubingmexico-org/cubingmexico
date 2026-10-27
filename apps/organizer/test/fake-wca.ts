import type { Competition } from "@/types/wca";
import type { WCIF } from "@/types/wcif";

// Stand-ins for the Better Auth session and the WCA competition API, wired in with vi.mock.

let signedInWcaId: string | null = null;
const competitions = new Map<string, Competition>();
const wcifs = new Map<string, WCIF>();

export function signIn(wcaId: string | null): void {
  signedInWcaId = wcaId;
}

export function addCompetition(
  id: string,
  {
    organizers = [],
    delegates = [],
    endDate = "2025-03-15",
  }: { organizers?: string[]; delegates?: string[]; endDate?: string },
): void {
  const staff = (wcaIds: string[]) =>
    wcaIds.map((wcaId, index) => ({ id: index + 1, wca_id: wcaId }));
  competitions.set(id, {
    id,
    organizers: staff(organizers),
    delegates: staff(delegates),
    end_date: endDate,
  } as unknown as Competition);
}

export function addWcif(wcif: WCIF): void {
  wcifs.set(wcif.id, wcif);
}

export function resetFakeWca(): void {
  signedInWcaId = null;
  competitions.clear();
  wcifs.clear();
}

export const fakeAuth = {
  api: {
    getSession: async () =>
      signedInWcaId
        ? { user: { id: signedInWcaId, wcaId: signedInWcaId } }
        : null,
  },
};

export async function fakeGetCompetitionById({
  id,
}: {
  id: string;
}): Promise<Competition | undefined> {
  return competitions.get(id);
}

export async function fakeGetWCIFByCompetitionId({
  competitionId,
}: {
  competitionId: string;
}): Promise<WCIF | undefined> {
  return wcifs.get(competitionId);
}
