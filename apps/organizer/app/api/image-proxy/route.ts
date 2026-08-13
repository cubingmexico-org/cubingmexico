import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Image URL is required", { status: 400 });
  }

  // Basic validation to prevent open proxy vulnerabilities
  const allowedDomain = "avatars.worldcubeassociation.org";
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== allowedDomain) {
      return new NextResponse("Invalid image domain", { status: 400 });
    }
  } catch (e) {
    console.error("Invalid URL error:", e);
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Forward some headers if necessary, but for images it's usually not needed
      },
    });

    if (!response.ok) {
      return new NextResponse(response.statusText, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache aggressively
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
