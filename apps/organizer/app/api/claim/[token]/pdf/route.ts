import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { certificateShare } from "@workspace/db/schema";
import { getCompetitionById, getWCIFByCompetitionId } from "@/db/queries";
import {
  parseShareJson,
  renderClaimPdf,
} from "@/lib/certificates/render-claim-pdf";
import { requireSessionUser } from "@/lib/design-access";

export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const user = await requireSessionUser();
  if (!user?.wcaId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await context.params;
  if (!token || token.length > 64) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [share] = await db
    .select()
    .from(certificateShare)
    .where(eq(certificateShare.token, token))
    .limit(1);

  if (!share) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const shareJson = parseShareJson(share.json);
  if (!shareJson) {
    return Response.json(
      { error: "El diseño publicado no es válido" },
      { status: 500 },
    );
  }

  const competition = await getCompetitionById({ id: share.competitionId });
  if (!competition) {
    return Response.json(
      { error: "No se encontró la competencia" },
      { status: 404 },
    );
  }

  const wcif = await getWCIFByCompetitionId({
    competitionId: share.competitionId,
  });
  if (!wcif) {
    return Response.json(
      { error: "No se pudo cargar el WCIF de la competencia" },
      { status: 502 },
    );
  }

  const result = await renderClaimPdf({
    competition,
    wcif,
    subject: user.wcaId,
    shareJson,
  });

  if (!result.ok) {
    if (result.reason === "not_in_competition") {
      return Response.json(
        {
          error:
            "No apareces como competidor en esta competencia, así que no hay certificado para ti.",
        },
        { status: 403 },
      );
    }
    if (result.reason === "no_participation_results") {
      return Response.json(
        {
          error:
            "Aún no hay resultados de participación disponibles para generar tu certificado.",
        },
        { status: 404 },
      );
    }
    return Response.json(
      { error: "No se pudo generar el certificado" },
      { status: 500 },
    );
  }

  return new Response(new Uint8Array(result.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
