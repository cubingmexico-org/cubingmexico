import JSZip from "jszip";

export type BadgeSide = "front" | "back";

/** Replaces whitespace so names work as file names. */
export function fileSafeName(name: string): string {
  return name.replace(/\s/g, "_");
}

export function badgeFileName(
  person: { name: string },
  side: BadgeSide,
  extension: string,
): string {
  return `${fileSafeName(person.name)}_badge_${side}.${extension}`;
}

export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  URL.revokeObjectURL(url);
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type?: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** A JPEG data URL's base64 payload, for adding to a ZIP without decoding. */
export function canvasToJpegBase64(canvas: HTMLCanvasElement): string | null {
  return canvas.toDataURL("image/jpeg", 0.95).split(",")[1] ?? null;
}

export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png", 1.0);
}

export async function downloadZip(
  fill: (zip: JSZip) => Promise<void>,
  filename: string,
): Promise<void> {
  const zip = new JSZip();
  await fill(zip);
  downloadBlob(await zip.generateAsync({ type: "blob" }), filename);
}
