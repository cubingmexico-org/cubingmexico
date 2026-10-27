const MAX_EDGE = 1200;
const MAX_BYTES = 7.5 * 1024 * 1024;

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Downscale large transparent PNGs so UploadThing accepts them and logos
 * stay reasonably sized for UI use.
 */
export async function prepareLogoFile(
  blob: Blob,
  fileName: string,
): Promise<File> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return new File([blob], fileName, { type: "image/png" });
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let outBlob = await canvasToPng(canvas);

  // If still huge, try a slightly smaller edge.
  if (outBlob && outBlob.size > MAX_BYTES) {
    const retryScale = Math.sqrt(MAX_BYTES / outBlob.size) * 0.95;
    const w2 = Math.max(1, Math.round(width * retryScale));
    const h2 = Math.max(1, Math.round(height * retryScale));
    canvas.width = w2;
    canvas.height = h2;
    ctx.clearRect(0, 0, w2, h2);
    const retryBitmap = await createImageBitmap(blob);
    ctx.drawImage(retryBitmap, 0, 0, w2, h2);
    retryBitmap.close();
    outBlob = await canvasToPng(canvas);
  }

  return new File([outBlob ?? blob], fileName, { type: "image/png" });
}
