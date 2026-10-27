import type { CanvasElement } from "@/types/canvas";
import { canvasFont, ensureFontLoaded } from "@/lib/load-fonts";
import {
  applyDropShadow,
  clearDropShadow,
  textAnchorX,
} from "@/lib/canvas-draw";
import { replacePlaceholders } from "./placeholders";
import type { BadgePreviewData } from "./preview-canvas";

export function measureTextAndAdjustFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseFontSize: number,
  fontFamily: string,
  fontWeight: string,
): { fontSize: number; lines: string[] } {
  let fontSize = baseFontSize;
  ctx.font = canvasFont(fontWeight, fontSize, fontFamily);

  const splitIntoLines = (text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Try to fit text in 2 lines maximum
  let lines = splitIntoLines(text, maxWidth);
  const lineHeight = fontSize * 1.2;
  let totalHeight = lines.length * lineHeight;

  // Reduce font size until text fits within bounds (max 2 lines)
  while ((totalHeight > maxHeight || lines.length > 2) && fontSize > 8) {
    fontSize -= 0.5;
    ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
    lines = splitIntoLines(text, maxWidth);
    totalHeight = lines.length * fontSize * 1.2;
  }

  // If still more than 2 lines, force into 2 lines
  if (lines.length > 2) {
    const words = text.split(" ");
    const midPoint = Math.ceil(words.length / 2);
    lines = [
      words.slice(0, midPoint).join(" "),
      words.slice(midPoint).join(" "),
    ];
  }

  return { fontSize, lines };
}

export async function drawText(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
): Promise<void> {
  const baseFontSize = element.fontSize || 24;
  const fontFamily = element.fontFamily || "sans-serif";
  const fontWeight = element.fontWeight || "normal";
  await ensureFontLoaded(fontFamily, fontWeight);

  const content = replacePlaceholders(element.content || "", data);

  const { fontSize: optimalFontSize, lines } = measureTextAndAdjustFontSize(
    ctx,
    content,
    element.width,
    element.height,
    baseFontSize,
    fontFamily,
    fontWeight,
  );

  applyDropShadow(ctx, element);

  ctx.fillStyle = element.color || "#000000";
  ctx.font = canvasFont(fontWeight, optimalFontSize, fontFamily);
  ctx.textAlign = element.textAlign || "left";

  const lineHeight = optimalFontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  const startY =
    element.y + (element.height - totalTextHeight) / 2 + optimalFontSize;

  const textX = textAnchorX(element);
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight);
  });

  clearDropShadow(ctx, element);

  ctx.textAlign = "left";
}
