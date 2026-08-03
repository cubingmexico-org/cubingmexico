import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/records/")) {
    return new NextResponse("Gone", { status: 410 });
  }

  if (/^\/rankings\/a\/[^/]+\/(single|average)(\/[^/]+)?$/i.test(pathname)) {
    return new NextResponse("Gone", { status: 410 });
  }

  if (pathname.startsWith("/team/")) {
    return new NextResponse("Gone", { status: 410 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/records/:path*", "/team/:path*", "/rankings/a/:path*"],
};
