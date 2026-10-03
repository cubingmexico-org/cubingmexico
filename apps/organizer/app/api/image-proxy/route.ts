import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/design-access";
import {
  IMAGE_PROXY_MAX_BYTES,
  IMAGE_PROXY_MAX_REDIRECTS,
  IMAGE_PROXY_TIMEOUT_MS,
  exceedsMaxBytes,
  isAcceptableImageContentType,
  parseAllowedRedirectUrl,
  parseAllowedSourceUrl,
} from "@/lib/image-proxy-policy";

const UPSTREAM_HEADERS = {
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "User-Agent": "Mozilla/5.0 (compatible; CubingMexico-Organizacion/1.0)",
  Referer: "https://www.worldcubeassociation.org/",
};

class ProxyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function fetchWithAllowedRedirects(
  source: URL,
  signal: AbortSignal,
): Promise<Response> {
  let current = source;
  for (let hop = 0; hop <= IMAGE_PROXY_MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: UPSTREAM_HEADERS,
      signal,
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new ProxyError("Upstream redirect without location", 502);
    }
    const next = parseAllowedRedirectUrl(location, current);
    if (!next) {
      console.error(
        "Image proxy blocked redirect:",
        current.href,
        "→",
        location,
      );
      throw new ProxyError("Upstream redirected to a disallowed host", 502);
    }
    current = next;
  }
  throw new ProxyError("Too many upstream redirects", 502);
}

async function readBodyWithLimit(response: Response): Promise<ArrayBuffer> {
  if (!response.body) return new ArrayBuffer(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > IMAGE_PROXY_MAX_BYTES) {
      await reader.cancel();
      throw new ProxyError("Image too large", 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export async function GET(request: NextRequest) {
  const user = await requireSessionUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const imageUrl = request.nextUrl.searchParams.get("url");
  if (!imageUrl) {
    return new NextResponse("Image URL is required", { status: 400 });
  }

  const source = parseAllowedSourceUrl(imageUrl);
  if (!source) {
    return new NextResponse("Invalid image URL", { status: 400 });
  }

  try {
    const response = await fetchWithAllowedRedirects(
      source,
      AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS),
    );

    if (!response.ok) {
      console.error(
        "Image proxy upstream failed:",
        response.status,
        imageUrl,
        "→",
        response.url,
      );
      return new NextResponse(response.statusText || "Upstream error", {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    if (!isAcceptableImageContentType(contentType)) {
      return new NextResponse("Upstream did not return an image", {
        status: 502,
      });
    }

    if (exceedsMaxBytes(response.headers.get("content-length"))) {
      await response.body?.cancel();
      return new NextResponse("Image too large", { status: 413 });
    }

    const body = await readBodyWithLimit(response);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType.toLowerCase().startsWith("image/")
          ? contentType
          : "image/png",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ProxyError) {
      return new NextResponse(error.message, { status: error.status });
    }
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return new NextResponse("Upstream timed out", { status: 504 });
    }
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
