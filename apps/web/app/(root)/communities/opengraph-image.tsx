import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Comunidades locales | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Comunidades locales",
    subtitle: "Comunidades locales de speedcubing en México.",
    badge: "Comunidades",
  });
}
