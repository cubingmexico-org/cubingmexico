import { getWCIFByCompetitionId, getCompetitionById } from "@/db/queries";
import {
  buildPodiums,
  type PodiumFilter,
} from "@/lib/certificates/podium-data";
import { podiumRequestSchema } from "@/lib/certificates/requests";
import { requireSessionUser } from "@/lib/design-access";

// POST rather than GET so competitors' birthdates never end up in a URL or request log.
export async function POST(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = podiumRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    competitionId,
    filterByCountry,
    country,
    template,
    minAge,
    maxAge,
    birthdates,
  } = parsed.data;

  const wcif = await getWCIFByCompetitionId({ competitionId });
  if (!wcif) {
    return Response.json([]);
  }

  const filter: PodiumFilter = {
    country: filterByCountry ? country : undefined,
    gender: template === "female" ? "f" : undefined,
    newcomer: template === "newcomer",
  };

  if (
    template === "age" &&
    birthdates &&
    minAge !== undefined &&
    maxAge !== undefined
  ) {
    const competition = await getCompetitionById({ id: competitionId });
    if (competition?.end_date) {
      const [year, month, day] = competition.end_date.split("-").map(Number);
      filter.age = {
        min: minAge,
        max: maxAge,
        birthdates: new Map(birthdates),
        referenceDate: new Date(year!, month! - 1, day),
      };
    }
  }

  return Response.json(buildPodiums(wcif, filter));
}
