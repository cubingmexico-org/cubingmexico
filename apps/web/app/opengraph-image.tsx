import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    title: "Cubing México",
    subtitle:
      "Rankings y récords estatales mexicanos basados en los resultados de la WCA.",
  });
}
