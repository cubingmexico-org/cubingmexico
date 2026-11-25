import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Sum of Ranks | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ rankType: "single" | "average" }>;
};

export default async function Image({ params }: Props) {
  const { rankType } = await params;
  const rankLabel = rankType === "single" ? "Single" : "Average";

  return renderOgImage({
    title: "Sum of Ranks",
    subtitle: `${rankLabel} · Ranking nacional de speedcubing en México.`,
    badge: "SOR",
  });
}
