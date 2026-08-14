/**
 * Load a remote image through the same-origin proxy as a data URL so pdfmake
 * does not hit CORS / Active Storage redirect failures in the browser.
 */
export async function loadImageAsDataUrl(
  imageUrl: string,
): Promise<string | null> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;

  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      console.error(
        "Scorecard background proxy failed:",
        response.status,
        trimmed,
      );
      return null;
    }
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (error) {
    console.error("Scorecard background load failed:", error);
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
