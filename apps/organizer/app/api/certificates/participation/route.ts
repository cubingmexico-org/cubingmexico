import { getWCIFByCompetitionId } from "@/db/queries";
import { buildParticipantResults } from "@/lib/certificates/participation-data";
import { competitionIdSchema } from "@/lib/certificates/requests";
import { requireSessionUser } from "@/lib/design-access";

export async function GET(request: Request): Promise<Response> {
  const user = await requireSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedId = competitionIdSchema.safeParse(
    searchParams.get("competitionId"),
  );
  if (!parsedId.success) {
    return Response.json({ error: "Invalid competitionId" }, { status: 400 });
  }

  const wcif = await getWCIFByCompetitionId({ competitionId: parsedId.data });
  return Response.json(wcif ? buildParticipantResults(wcif) : []);
}
