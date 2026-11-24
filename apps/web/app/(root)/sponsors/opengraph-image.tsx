import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Patrocinadores | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Patrocinadores",
    subtitle:
      "Cubing México existe gracias a sus patrocinadores. Conoce los equipos que mantienen el sitio.",
    badge: "Sponsors",
  });
}
