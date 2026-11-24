import { getEvents } from "@/db/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";
import type { EventId } from "@/types/wca";

export const alt = "Rankings | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ eventId: EventId; rankType: "single" | "average" }>;
};

export default async function Image({ params }: Props) {
  const { eventId, rankType } = await params;
  const events = await getEvents("all");
  const eventName =
    events.find((event) => event.id === eventId)?.name ?? eventId;
  const rankLabel = rankType === "single" ? "Singles" : "Averages";

  return renderOgImage({
    title: eventName,
    subtitle: `Ranking de ${rankLabel} · Cubing México`,
    badge: rankLabel,
  });
}
