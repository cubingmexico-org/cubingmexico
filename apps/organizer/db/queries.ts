import type { WCIF } from "@/types/wcif";
import type { Competition } from "@/types/wca";

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
    const res = await fetch(
      `https://worldcubeassociation.org/api/v0/competitions/${competitionId}/wcif/public`,
      {
        next: {
          tags: [`wcif-${competitionId}`],
        },
      },
    );

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

export interface Team {
  name: string;
  stateId: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  founded: Date | null;
  socialLinks: {
    email?: string | undefined;
    whatsapp?: string | undefined;
    facebook?: string | undefined;
    instagram?: string | undefined;
    twitter?: string | undefined;
    tiktok?: string | undefined;
  } | null;
  isActive: boolean;
}

export async function getTeams(): Promise<Team[]> {
  try {
    const res = await fetch(`${process.env.API_URL}/teams`, {
      next: { revalidate: 3600 },
    });

    const data = await res.json();

    return data;
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
    const res = await fetch(`${process.env.API_URL}/states`, {
      next: { revalidate: false },
    });

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching states:", error);
    return [];
  }
}

export async function getCompetitorStates(competitionId: string): Promise<
  {
    wcaId: string;
    stateId: string | null;
  }[]
> {
  try {
    const res = await fetch(
      `${process.env.API_URL}/competitor-states/${competitionId}`,
      {
        next: { revalidate: 3600 },
      },
    );

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return [];
  }
}
