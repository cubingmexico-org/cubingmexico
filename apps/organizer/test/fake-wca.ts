import type { Competition } from "@/types/wca";

// Stand-ins for the Better Auth session and the WCA competition API, wired in with vi.mock.

let signedInWcaId: string | null = null;
const competitions = new Map<string, Competition>();

export function signIn(wcaId: string | null): void {
  signedInWcaId = wcaId;
}

export function addCompetition(
  id: string,
  {
    organizers = [],
    delegates = [],
  }: { organizers?: string[]; delegates?: string[] },
): void {
  const staff = (wcaIds: string[]) =>
    wcaIds.map((wcaId, index) => ({ id: index + 1, wca_id: wcaId }));
  competitions.set(id, {
    id,
    organizers: staff(organizers),
    delegates: staff(delegates),
  } as unknown as Competition);
}

export function resetFakeWca(): void {
  signedInWcaId = null;
  competitions.clear();
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
