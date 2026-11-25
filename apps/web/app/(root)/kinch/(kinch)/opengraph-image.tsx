import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Kinch Ranks | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Kinch Ranks nacionales",
    subtitle: "Puntuación 0–100 por evento frente al récord nacional.",
    badge: "Kinch",
  });
}
