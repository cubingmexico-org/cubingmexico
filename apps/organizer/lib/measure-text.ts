import { canvasFont } from "@/lib/load-fonts";

/**
 * Measures the box a single line of canvas text occupies. Returns null when no
 * 2D context is available.
 */
export function measureTextBox(
  text: string,
  weight: string,
  size: number,
  family: string,
): { width: number; height: number } | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = canvasFont(weight, size, family);
  return { width: ctx.measureText(text).width, height: size * 1.2 };
}
