/**
 * The file key of an UploadThing URL, or null for any other URL.
 *
 * Handles `https://<appId>.ufs.sh/f/<key>` (current) and the legacy
 * `https://utfs.io/f/<key>` and `https://utfs.io/a/<appId>/<key>` forms.
 */
export function uploadThingFileKey(
  url: string | null | undefined,
): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (host.endsWith(".ufs.sh") || host === "utfs.io") {
    if (segments.length === 2 && segments[0] === "f") {
      return decodeURIComponent(segments[1]!);
    }
  }
  if (host === "utfs.io" && segments.length === 3 && segments[0] === "a") {
    return decodeURIComponent(segments[2]!);
  }
  return null;
}
