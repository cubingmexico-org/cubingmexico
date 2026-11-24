import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Récords | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Récords nacionales",
    subtitle:
      "Los récords nacionales de speedcubing en México basados en resultados de la WCA.",
    badge: "Récords",
  });
}
