import { getTeamInfo } from "./_lib/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Equipo | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ stateId: string }>;
};

export default async function Image({ params }: Props) {
  const { stateId } = await params;
  const team = await getTeamInfo(stateId);

  if (!team) {
    return renderOgImage({
      title: "Cubing México",
      subtitle: "Equipos estatales de speedcubing en México.",
      badge: "Equipos",
    });
  }

  return renderOgImage({
    title: team.name ?? "Equipo",
    subtitle: `Equipo de ${team.state} · Cubing México`,
    badge: "Equipo",
    imageSrc: team.image,
    initials: team.name ?? stateId,
  });
}
