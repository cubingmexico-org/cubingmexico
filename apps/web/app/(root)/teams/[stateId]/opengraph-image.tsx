import { getTeamInfo } from "./_lib/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Team | Cubing México";
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
      subtitle: "Teams estatales de speedcubing en México.",
      badge: "Teams",
    });
  }

  return renderOgImage({
    title: team.name ?? "Team",
    subtitle: `Team de ${team.state} · Cubing México`,
    badge: "Team",
    imageSrc: team.image,
    initials: team.name ?? stateId,
  });
}
