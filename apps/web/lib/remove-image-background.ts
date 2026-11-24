/** Max per-channel delta for corner samples to count as a uniform background. */
const CORNER_AGREE_TOLERANCE = 18;
/** Max per-channel delta from background color during flood-fill removal. */
const COLOR_TOLERANCE = 40;
/** Alpha below this is treated as fully transparent. */
const ALPHA_LOW = 16;
/** Alpha above this is treated as fully opaque. */
const ALPHA_HIGH = 240;

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

function pixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

async function decodeToImageData(source: Blob | string): Promise<ImageData> {
  const blob =
    typeof source === "string" ? await (await fetch(source)).blob() : source;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo crear el contexto de canvas");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function imageDataToPngBlob(data: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear el contexto de canvas");
  }
  ctx.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) {
    throw new Error("No se pudo codificar el PNG");
  }
  return blob;
}

function sampleEdgeColors(data: ImageData): Array<[number, number, number]> {
  const { width: w, height: h, data: px } = data;
  const inset = Math.min(2, Math.floor(Math.min(w, h) / 2));
  const points: Array<[number, number]> = [
    [inset, inset],
    [w - 1 - inset, inset],
    [inset, h - 1 - inset],
    [w - 1 - inset, h - 1 - inset],
    [Math.floor(w / 2), inset],
    [Math.floor(w / 2), h - 1 - inset],
    [inset, Math.floor(h / 2)],
    [w - 1 - inset, Math.floor(h / 2)],
  ];

  return points.map(([x, y]) => {
    const i = pixelIndex(x, y, w);
    return [px[i]!, px[i + 1]!, px[i + 2]!];
  });
}

function detectUniformBackground(
  data: ImageData,
): { r: number; g: number; b: number } | null {
  const samples = sampleEdgeColors(data);
  if (samples.length === 0) return null;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const [r, g, b] of samples) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const n = samples.length;
  const avgR = sumR / n;
  const avgG = sumG / n;
  const avgB = sumB / n;

  for (const [r, g, b] of samples) {
    if (colorDistance(r, g, b, avgR, avgG, avgB) > CORNER_AGREE_TOLERANCE) {
      return null;
    }
  }

  return {
    r: Math.round(avgR),
    g: Math.round(avgG),
    b: Math.round(avgB),
  };
}

function matchesBackground(
  data: Uint8ClampedArray,
  i: number,
  bg: { r: number; g: number; b: number },
  tolerance: number,
): boolean {
  return (
    colorDistance(data[i]!, data[i + 1]!, data[i + 2]!, bg.r, bg.g, bg.b) <=
    tolerance
  );
}

/** Flood-fill from the border through pixels matching the background color. */
function floodFillRemoveBackground(
  data: ImageData,
  bg: { r: number; g: number; b: number },
): ImageData {
  const { width, height } = data;
  const px = new Uint8ClampedArray(data.data);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    const id = y * width + x;
    if (visited[id]) return;
    const i = id * 4;
    if (!matchesBackground(px, i, bg, COLOR_TOLERANCE)) return;
    visited[id] = 1;
    queue[tail++] = id;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const id = queue[head++]!;
    const x = id % width;
    const y = (id / width) | 0;
    const i = id * 4;
    px[i + 3] = 0;

    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  return new ImageData(px, width, height);
}

function hardenAlpha(data: ImageData): ImageData {
  const px = data.data;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i]!;
    if (a < ALPHA_LOW) {
      px[i] = 0;
    } else if (a > ALPHA_HIGH) {
      px[i] = 255;
    }
  }
  return data;
}

/**
 * Transparent pixels reachable from the border stay transparent. Enclosed
 * transparent holes (punched letter fills) are restored from the original.
 */
function restoreEnclosedHoles(
  original: ImageData,
  result: ImageData,
): ImageData {
  const { width, height } = result;
  if (original.width !== width || original.height !== height) {
    return result;
  }

  const out = new Uint8ClampedArray(result.data);
  const orig = original.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isTransparent = (id: number) => out[id * 4 + 3]! < ALPHA_LOW;

  const enqueue = (x: number, y: number) => {
    const id = y * width + x;
    if (visited[id] || !isTransparent(id)) return;
    visited[id] = 1;
    queue[tail++] = id;
  };

  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const id = queue[head++]!;
    const x = id % width;
    const y = (id / width) | 0;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  for (let id = 0; id < width * height; id++) {
    if (visited[id] || !isTransparent(id)) continue;
    const i = id * 4;
    out[i] = orig[i]!;
    out[i + 1] = orig[i + 1]!;
    out[i + 2] = orig[i + 2]!;
    out[i + 3] = orig[i + 3]!;
  }

  return new ImageData(out, width, height);
}

async function removeWithModel(
  source: Blob | string,
  original: ImageData,
): Promise<ImageData> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(source, {
    model: "isnet",
    output: { format: "image/png" },
  });
  const result = await decodeToImageData(blob);
  return restoreEnclosedHoles(original, result);
}

/**
 * Removes the image background, preferring flood-fill for near-uniform
 * (typical logo) backgrounds so letter fills are not punched out.
 */
export async function removeImageBackground(
  source: Blob | string,
): Promise<Blob> {
  const original = await decodeToImageData(source);
  const bg = detectUniformBackground(original);

  const processed = bg
    ? floodFillRemoveBackground(original, bg)
    : await removeWithModel(source, original);

  return imageDataToPngBlob(hardenAlpha(processed));
}
