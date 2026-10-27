import type { CanvasElement } from "@/types/canvas";
import type { EventId, ExtendedPerson, WCIF } from "@/types/wcif";
import type { State, Team } from "@/db/queries";
import {
  applyElementTransform,
  drawCircle,
  drawRectangle,
} from "@/lib/canvas-draw";
import { fillWhite, loadImage } from "./canvas-images";
import { drawImage } from "./draw-images";
import { drawQrCode } from "./draw-qr";
import { drawText } from "./draw-text";

export interface BadgePreviewData {
  /** A person without a name renders a blank badge: no placeholders, person images or groups QR. */
  person: ExtendedPerson;
  states: State[];
  teams: Team[];
  wcif?: WCIF;
  competitionId: string;
  competitionLogoUrl?: string | null;
  /** Orders event icons, and lists them all on blank badges. */
  competitionEventIds?: EventId[];
}

export async function createCanvasForSide({
  elements,
  backgroundImage,
  canvasWidth,
  canvasHeight,
  ...data
}: BadgePreviewData & {
  elements: CanvasElement[];
  backgroundImage?: string;
  canvasWidth: number;
  canvasHeight: number;
}): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const background = backgroundImage
    ? await loadImage(backgroundImage, { crossOrigin: "anonymous" })
    : null;
  if (background) {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } else {
    if (backgroundImage) console.error("Failed to load background image");
    fillWhite(ctx);
  }

  await drawElements(ctx, elements, data);

  return canvas;
}

export async function drawElements(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  data: BadgePreviewData,
) {
  for (const element of elements) {
    ctx.save();
    applyElementTransform(ctx, element);

    switch (element.type) {
      case "rectangle":
        drawRectangle(ctx, element);
        break;
      case "circle":
        drawCircle(ctx, element);
        break;
      case "text":
        await drawText(ctx, element, data);
        break;
      case "image":
        await drawImage(ctx, element, data);
        break;
      case "qrcode":
        await drawQrCode(ctx, element, data);
        break;
    }

    ctx.restore();
  }
}
