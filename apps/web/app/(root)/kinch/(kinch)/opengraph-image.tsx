import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Kinch Ranks | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Kinch Ranks nacionales",
    subtitle:
      "Clasificación Kinch de los mejores cuberos de México en los eventos oficiales de la WCA.",
    badge: "Kinch",
  });
}
