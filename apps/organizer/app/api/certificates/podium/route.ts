import { getWCIFByCompetitionId } from "@/db/queries";
import { birthdatesFromAuthorizedWcif } from "@/lib/certificates/authorized-person-fields";
import {
  buildPodiums,
  type PodiumFilter,
} from "@/lib/certificates/podium-data";
import { podiumRequestSchema } from "@/lib/certificates/requests";
import {
  assertManagesCompetition,
  requireSessionUser,
} from "@/lib/design-access";
import { getAuthorizedWcif, requireWcaAccessToken } from "@/lib/wca-wcif";

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

  const { competitionId, filterByCountry, country, template, minAge, maxAge } =
    parsed.data;

  const filter: PodiumFilter = {
    country: filterByCountry ? country : undefined,
    gender: template === "female" ? "f" : undefined,
    newcomer: template === "newcomer",
  };

  if (template === "age") {
    if (minAge === undefined || maxAge === undefined) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const access = await assertManagesCompetition(user.id, competitionId);
    if (!access.ok) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let token: string;
    try {
      token = await requireWcaAccessToken();
    } catch {
      return Response.json(
        {
          error:
            "No se pudo obtener el token de WCA. Cierra sesión y vuelve a entrar con permisos de manage_competitions.",
        },
        { status: 401 },
      );
    }

    let authorizedWcif;
    try {
      authorizedWcif = await getAuthorizedWcif(competitionId, token);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el WCIF autorizado",
        },
        { status: 502 },
      );
    }

    const competition = access.competition;
    if (!competition.end_date) {
      return Response.json([]);
    }

    const [year, month, day] = competition.end_date.split("-").map(Number);
    filter.age = {
      min: minAge,
      max: maxAge,
      birthdates: birthdatesFromAuthorizedWcif(authorizedWcif),
      referenceDate: new Date(year!, month! - 1, day),
    };

    return Response.json(buildPodiums(authorizedWcif, filter));
  }

  const wcif = await getWCIFByCompetitionId({ competitionId });
  if (!wcif) {
    return Response.json([]);
  }

  return Response.json(buildPodiums(wcif, filter));
}
