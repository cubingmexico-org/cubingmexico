import { getTeam } from "@/db/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Kinch Ranks | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ stateId: string }>;
};

export default async function Image({ params }: Props) {
  const { stateId } = await params;
  const team = await getTeam(stateId);

  if (!team) {
    return renderOgImage({
      title: "Kinch Ranks",
      subtitle: "Rankings Kinch estatales de speedcubing en México.",
      badge: "Kinch",
    });
  }

  return renderOgImage({
    title: `Kinch Ranks de ${team.state}`,
    subtitle: `Ranking Kinch del ${team.name} en Cubing México.`,
    badge: "Kinch",
  });
}
