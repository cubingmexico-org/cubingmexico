import { NextRequest, NextResponse } from "next/server";

function isAllowedSourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "avatars.worldcubeassociation.org" ||
    host === "worldcubeassociation.org" ||
    host.endsWith(".worldcubeassociation.org") ||
    host === "utfs.io" ||
    host.endsWith(".utfs.io") ||
    host === "ufs.sh" ||
    host.endsWith(".ufs.sh")
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Image URL is required", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch (e) {
    console.error("Invalid URL error:", e);
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!isAllowedSourceHost(parsed.hostname)) {
    return new NextResponse("Invalid image domain", { status: 400 });
  }

  try {
    // WCA Active Storage redirects to signed S3 URLs — follow those.
    // Only the *source* URL is allowlisted (not the final redirect host).
    const response = await fetch(imageUrl, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; CubingMexico-Organizacion/1.0)",
        Referer: "https://www.worldcubeassociation.org/",
      },
    });

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

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";
    if (
      !contentType.startsWith("image/") &&
      !contentType.includes("octet-stream")
    ) {
      return new NextResponse("Upstream did not return an image", {
        status: 502,
      });
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("image/")
          ? contentType
          : "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
