/** Loads an image; resolves to null instead of rejecting when it fails. */
export function loadImage(
  src: string,
  { crossOrigin }: { crossOrigin?: "anonymous" } = {},
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function fillWhite(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** Draws the image tinted with a solid color, keeping its alpha. */
export function drawTintedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  color: string,
  x: number,
  y: number,
  size: number,
): void {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCtx.drawImage(img, 0, 0, size, size);
  tempCtx.globalCompositeOperation = "source-in";
  tempCtx.fillStyle = color;
  tempCtx.fillRect(0, 0, size, size);

  ctx.drawImage(tempCanvas, x, y, size, size);
}
