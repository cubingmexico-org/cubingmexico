import type { CanvasElement } from "@/types/canvas";

// Snap threshold in pixels
export const SNAP_THRESHOLD = 5;

export const HANDLE_SIZE = 8;

const MIN_RESIZE_SIZE = 20;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface Guides {
  horizontal: number | null;
  vertical: number | null;
}

export function getResizeHandleRects(
  element: Box,
): { name: ResizeHandle; x: number; y: number }[] {
  return [
    {
      name: "top-left",
      x: element.x - HANDLE_SIZE / 2,
      y: element.y - HANDLE_SIZE / 2,
    },
    {
      name: "top-right",
      x: element.x + element.width - HANDLE_SIZE / 2,
      y: element.y - HANDLE_SIZE / 2,
    },
    {
      name: "bottom-left",
      x: element.x - HANDLE_SIZE / 2,
      y: element.y + element.height - HANDLE_SIZE / 2,
    },
    {
      name: "bottom-right",
      x: element.x + element.width - HANDLE_SIZE / 2,
      y: element.y + element.height - HANDLE_SIZE / 2,
    },
  ];
}

export function getResizeHandle(
  x: number,
  y: number,
  element: Box,
): ResizeHandle | null {
  for (const handle of getResizeHandleRects(element)) {
    if (
      x >= handle.x &&
      x <= handle.x + HANDLE_SIZE &&
      y >= handle.y &&
      y <= handle.y + HANDLE_SIZE
    ) {
      return handle.name;
    }
  }
  return null;
}

export function isPointInBox(x: number, y: number, box: Box): boolean {
  return (
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  );
}

/** Returns the topmost element under the point. */
export function hitTest<T extends Box>(
  elements: T[],
  x: number,
  y: number,
): T | undefined {
  return [...elements].reverse().find((element) => isPointInBox(x, y, element));
}

export function isResizeLargeEnough(box: Box): boolean {
  return box.width > MIN_RESIZE_SIZE && box.height > MIN_RESIZE_SIZE;
}

export function resizeElementBox({
  element,
  handle,
  start,
  x,
  y,
  eventCount,
}: {
  element: CanvasElement;
  handle: ResizeHandle;
  start: Box;
  x: number;
  y: number;
  eventCount: number;
}): Box {
  let newX = start.x;
  let newY = start.y;
  let newWidth = start.width;
  let newHeight = start.height;

  switch (handle) {
    case "top-left":
      newWidth = start.width + (start.x - x);
      newHeight = start.height + (start.y - y);
      newX = x;
      newY = y;
      break;
    case "top-right":
      newWidth = x - start.x;
      newHeight = start.height + (start.y - y);
      newY = y;
      break;
    case "bottom-left":
      newWidth = start.width + (start.x - x);
      newHeight = y - start.y;
      newX = x;
      break;
    case "bottom-right":
      newWidth = x - start.x;
      newHeight = y - start.y;
      break;
  }

  if (
    (element.type === "image" || element.type === "qrcode") &&
    element.keepAspectRatio
  ) {
    const size = Math.max(newWidth, newHeight);
    newWidth = size;
    newHeight = size;

    if (handle === "top-left") {
      newX = start.x + start.width - size;
      newY = start.y + start.height - size;
    } else if (handle === "top-right") {
      newY = start.y + start.height - size;
    } else if (handle === "bottom-left") {
      newX = start.x + start.width - size;
    }
  }

  if (element.imageUrl === "/country.svg") {
    newHeight = (newWidth * 4) / 7;
  }

  if (element.imageUrl === "/events.svg") {
    const iconSize = newHeight;
    const spacing = 5;
    newWidth = iconSize * eventCount + spacing * (eventCount - 1);
  }

  return { x: newX, y: newY, width: newWidth, height: newHeight };
}

export function scaleFontSize(
  baseFontSize: number,
  start: Box,
  resized: Box,
): number {
  const widthRatio = resized.width / start.width;
  const heightRatio = resized.height / start.height;
  const scaleRatio = Math.min(widthRatio, heightRatio);
  return Math.max(8, baseFontSize * scaleRatio);
}

/**
 * Snaps the element's center to the canvas center or to another element's
 * center when within SNAP_THRESHOLD, returning the guides to draw.
 */
export function snapToGuides({
  element,
  x,
  y,
  elements,
  canvasWidth,
  canvasHeight,
}: {
  element: CanvasElement;
  x: number;
  y: number;
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
}): { x: number; y: number; guides: Guides } {
  let newX = x;
  let newY = y;

  const elementCenterX = x + element.width / 2;
  const elementCenterY = y + element.height / 2;

  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  let horizontalGuide: number | null = null;
  let verticalGuide: number | null = null;

  if (Math.abs(elementCenterY - canvasCenterY) < SNAP_THRESHOLD) {
    newY = canvasCenterY - element.height / 2;
    horizontalGuide = canvasCenterY;
  }

  if (Math.abs(elementCenterX - canvasCenterX) < SNAP_THRESHOLD) {
    newX = canvasCenterX - element.width / 2;
    verticalGuide = canvasCenterX;
  }

  elements.forEach((other) => {
    if (other.id === element.id) return;

    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.height / 2;

    if (
      horizontalGuide === null &&
      Math.abs(elementCenterY - otherCenterY) < SNAP_THRESHOLD
    ) {
      newY = otherCenterY - element.height / 2;
      horizontalGuide = otherCenterY;
    }

    if (
      verticalGuide === null &&
      Math.abs(elementCenterX - otherCenterX) < SNAP_THRESHOLD
    ) {
      newX = otherCenterX - element.width / 2;
      verticalGuide = otherCenterX;
    }
  });

  return {
    x: newX,
    y: newY,
    guides: { horizontal: horizontalGuide, vertical: verticalGuide },
  };
}
