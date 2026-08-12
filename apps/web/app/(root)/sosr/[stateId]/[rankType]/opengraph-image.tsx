import { getStates } from "@/db/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Sum Of State Ranks | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ stateId: string; rankType: "single" | "average" }>;
};

export default async function Image({ params }: Props) {
  const { stateId, rankType } = await params;
  const states = await getStates();
  const stateName = states.find((state) => state.id === stateId)?.name;
  const rankLabel = rankType === "single" ? "Single" : "Average";

  if (!stateName) {
    return renderOgImage({
      title: "Sum Of State Ranks",
      subtitle: "Suma de rankings estatales de speedcubing en México.",
      badge: rankLabel,
    });
  }

  return renderOgImage({
    title: `Sum Of State Ranks`,
    subtitle: `${stateName} · ${rankLabel}`,
    badge: "SOSR",
  });
}
