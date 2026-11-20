import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { certificateShare } from "@workspace/db/schema";
import { getCompetitionById } from "@/db/queries";

export type ClaimShareInfo = {
  competitionId: string;
  competitionName: string;
  module: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  if (!token || token.length > 64) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [share] = await db
    .select({
      competitionId: certificateShare.competitionId,
      module: certificateShare.module,
    })
    .from(certificateShare)
    .where(eq(certificateShare.token, token))
    .limit(1);

  if (!share) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const competition = await getCompetitionById({ id: share.competitionId });
  if (!competition) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body: ClaimShareInfo = {
    competitionId: share.competitionId,
    competitionName: competition.name,
    module: share.module,
  };

  return Response.json(body);
}
