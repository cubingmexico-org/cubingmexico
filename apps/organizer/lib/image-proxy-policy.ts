export const IMAGE_PROXY_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_PROXY_MAX_REDIRECTS = 3;
export const IMAGE_PROXY_TIMEOUT_MS = 10_000;

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

const SOURCE_DOMAINS = ["worldcubeassociation.org", "utfs.io", "ufs.sh"];

// WCA Active Storage redirects to signed S3 URLs; only reachable as a redirect hop.
const REDIRECT_ONLY_DOMAINS = ["amazonaws.com"];

function parseHttpsUrl(value: string | URL): URL | null {
  let url: URL;
  try {
    url = typeof value === "string" ? new URL(value) : value;
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url;
}

export function parseAllowedSourceUrl(value: string): URL | null {
  const url = parseHttpsUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  return SOURCE_DOMAINS.some((d) => matchesDomain(host, d)) ? url : null;
}

export function parseAllowedRedirectUrl(
  location: string,
  base: URL,
): URL | null {
  let resolved: URL;
  try {
    resolved = new URL(location, base);
  } catch {
    return null;
  }
  const url = parseHttpsUrl(resolved);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  return [...SOURCE_DOMAINS, ...REDIRECT_ONLY_DOMAINS].some((d) =>
    matchesDomain(host, d),
  )
    ? url
    : null;
}

export function isAcceptableImageContentType(contentType: string): boolean {
  const type = contentType.toLowerCase();
  return type.startsWith("image/") || type.includes("octet-stream");
}

export function exceedsMaxBytes(contentLength: string | null): boolean {
  if (!contentLength) return false;
  const length = Number(contentLength);
  return Number.isFinite(length) && length > IMAGE_PROXY_MAX_BYTES;
}
