const MIN_SIZE = 20;

export function clampElementToCanvas(
  el: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  minSize = MIN_SIZE,
) {
  const width = Math.min(Math.max(el.width, minSize), canvasWidth);
  const height = Math.min(Math.max(el.height, minSize), canvasHeight);
  const x = Math.min(Math.max(el.x, 0), canvasWidth - width);
  const y = Math.min(Math.max(el.y, 0), canvasHeight - height);
  return { x, y, width, height };
}
