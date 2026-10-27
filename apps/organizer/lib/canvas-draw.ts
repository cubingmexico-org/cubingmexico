import type { CanvasElement } from "@/types/canvas";
import { canvasFont } from "@/lib/load-fonts";
import {
  HANDLE_SIZE,
  getResizeHandleRects,
  type Box,
  type Guides,
} from "@/lib/canvas-geometry";

const SELECTION_COLOR = "#6366f1";
const GUIDE_COLOR = "#f43f5e";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
) {
  const { width, height } = ctx.canvas;
  if (image && image.complete) {
    ctx.drawImage(image, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
}

export function applyElementTransform(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;

  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);
}

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  ctx.fillStyle = element.backgroundColor || "#3b82f6";
  ctx.fillRect(element.x, element.y, element.width, element.height);
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  ctx.fillStyle = element.backgroundColor || "#8b5cf6";
  ctx.beginPath();
  ctx.arc(
    element.x + element.width / 2,
    element.y + element.height / 2,
    element.width / 2,
    0,
    2 * Math.PI,
  );
  ctx.fill();
}

export function applyDropShadow(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  if (!element.dropShadow?.enabled) return;
  ctx.shadowColor = element.dropShadow.color || "#000000";
  ctx.shadowBlur = element.dropShadow.blur || 4;
  ctx.shadowOffsetX = element.dropShadow.offsetX || 2;
  ctx.shadowOffsetY = element.dropShadow.offsetY || 2;
}

export function clearDropShadow(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  if (!element.dropShadow?.enabled) return;
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function textAnchorX(element: CanvasElement): number {
  if (element.textAlign === "center") return element.x + element.width / 2;
  if (element.textAlign === "right") return element.x + element.width;
  return element.x;
}

/**
 * Clips to the box with rounded corners; a radius of 50 clips to a circle.
 * Callers save the context before and restore it after drawing.
 */
export function roundedRectClip(
  ctx: CanvasRenderingContext2D,
  box: Box,
  borderRadius: number,
) {
  ctx.beginPath();

  if (borderRadius === 50) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.min(box.width, box.height) / 2;
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  } else {
    // Cap the radius to prevent overlapping corners
    const maxRadius = Math.min(box.width, box.height) / 2;
    const radius = Math.min((borderRadius / 100) * maxRadius * 2, maxRadius);

    ctx.moveTo(box.x + radius, box.y);
    ctx.lineTo(box.x + box.width - radius, box.y);
    ctx.quadraticCurveTo(
      box.x + box.width,
      box.y,
      box.x + box.width,
      box.y + radius,
    );
    ctx.lineTo(box.x + box.width, box.y + box.height - radius);
    ctx.quadraticCurveTo(
      box.x + box.width,
      box.y + box.height,
      box.x + box.width - radius,
      box.y + box.height,
    );
    ctx.lineTo(box.x + radius, box.y + box.height);
    ctx.quadraticCurveTo(
      box.x,
      box.y + box.height,
      box.x,
      box.y + box.height - radius,
    );
    ctx.lineTo(box.x, box.y + radius);
    ctx.quadraticCurveTo(box.x, box.y, box.x + radius, box.y);
  }

  ctx.closePath();
  ctx.clip();
}

function drawText(ctx: CanvasRenderingContext2D, element: CanvasElement) {
  const fontSize = element.fontSize || 24;
  const fontFamily = element.fontFamily || "sans-serif";
  const fontWeight = element.fontWeight || "normal";
  const content = element.content || "";

  applyDropShadow(ctx, element);

  ctx.fillStyle = element.color || "#000000";
  ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
  ctx.textAlign = element.textAlign || "left";

  ctx.fillText(content, textAnchorX(element), element.y + fontSize);

  clearDropShadow(ctx, element);

  ctx.textAlign = "left";
}

function drawImagePlaceholder(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  label: string,
) {
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(element.x, element.y, element.width, element.height);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    label,
    element.x + element.width / 2,
    element.y + element.height / 2,
  );
  ctx.textAlign = "left";
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  images: Map<string, HTMLImageElement>,
) {
  if (!element.imageUrl) {
    drawImagePlaceholder(ctx, element, "Image");
    return;
  }

  const cachedImg = images.get(element.imageUrl);
  if (!cachedImg || !cachedImg.complete) {
    drawImagePlaceholder(ctx, element, "Cargando...");
    return;
  }

  const rounded = !!element.borderRadius && element.borderRadius > 0;
  if (rounded) {
    ctx.save();
    roundedRectClip(ctx, element, element.borderRadius!);
  }

  ctx.drawImage(cachedImg, element.x, element.y, element.width, element.height);

  if (rounded) {
    ctx.restore();
  }
}

function drawQrCodePlaceholder(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  ctx.fillStyle = element.qrBackground || "#ffffff";
  ctx.fillRect(element.x, element.y, element.width, element.height);

  ctx.strokeStyle = element.qrForeground || "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(element.x, element.y, element.width, element.height);

  ctx.fillStyle = element.qrForeground || "#000000";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Código QR",
    element.x + element.width / 2,
    element.y + element.height / 2 - 10,
  );

  if (element.qrData) {
    ctx.font = "10px sans-serif";
    const maxLength = 20;
    const displayText =
      element.qrData.length > maxLength
        ? element.qrData.substring(0, maxLength) + "..."
        : element.qrData;
    ctx.fillText(
      displayText,
      element.x + element.width / 2,
      element.y + element.height / 2 + 10,
    );
  }
  ctx.textAlign = "left";
}

/** Selection border and resize handles; expects the element's transform. */
export function drawSelection(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
) {
  ctx.globalAlpha = 1;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(
    element.x - 2,
    element.y - 2,
    element.width + 4,
    element.height + 4,
  );
  ctx.setLineDash([]);

  ctx.fillStyle = SELECTION_COLOR;
  getResizeHandleRects(element).forEach((handle) => {
    ctx.fillRect(handle.x, handle.y, HANDLE_SIZE, HANDLE_SIZE);
  });
}

/** Draws an element as shown in the editor, using preloaded images. */
export function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  images: Map<string, HTMLImageElement>,
  selected: boolean,
) {
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
      drawText(ctx, element);
      break;
    case "image":
      drawImage(ctx, element, images);
      break;
    case "qrcode":
      drawQrCodePlaceholder(ctx, element);
      break;
  }

  if (selected) {
    drawSelection(ctx, element);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

export function drawGuides(ctx: CanvasRenderingContext2D, guides: Guides) {
  const { width, height } = ctx.canvas;

  ctx.save();
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (guides.horizontal !== null) {
    ctx.beginPath();
    ctx.moveTo(0, guides.horizontal);
    ctx.lineTo(width, guides.horizontal);
    ctx.stroke();
  }

  if (guides.vertical !== null) {
    ctx.beginPath();
    ctx.moveTo(guides.vertical, 0);
    ctx.lineTo(guides.vertical, height);
    ctx.stroke();
  }

  ctx.restore();
}
