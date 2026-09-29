import { buildIcs, wcifToCalendarEvents } from "@/lib/calendar";
import { getPublicWcif, getWcaCompetitionData } from "../_lib/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const competition = await getWcaCompetitionData(id);
  if (!competition) {
    return new Response("Competencia no encontrada", { status: 404 });
  }

  const wcif = await getPublicWcif(id).catch(() => null);
  const ics = buildIcs(
    wcifToCalendarEvents(wcif, competition),
    competition.name,
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}.ics"`,
    },
  });
}
