import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Teams | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Equipos estatales",
    subtitle:
      "Encuentra tu Team de speedcubing en México y conéctate con otros cuberos.",
    badge: "Equipos",
  });
}
