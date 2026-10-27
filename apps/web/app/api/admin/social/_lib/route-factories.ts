import { connection, NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { parseOptionalJsonBody } from "@/lib/route-input";
import { isSuperadmin } from "@/lib/superadmin";
import {
  fetchSocialCaption,
  fetchSocialImage,
  markSocialPosted,
  publishSocialPost,
  type SocialPostType,
} from "@/app/(root)/admin/_lib/social";

type RouteOptions<P extends string> = {
  postType: SocialPostType;
  /** Name of the dynamic segment that holds the subject key. */
  param: P;
  /** Used in error messages, e.g. "NÉMESIS". */
  label: string;
};

type RouteContext<P extends string> = { params: Promise<Record<P, string>> };

type SocialRouteHandler<P extends string> = (
  request: Request,
  context: RouteContext<P>,
) => Promise<NextResponse>;

function decodeKey(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function upstreamStatus(status: number): number {
  return status >= 400 ? status : 502;
}

function errorResponse(error: unknown, fallback: string): NextResponse {
  reportError(error);
  return NextResponse.json(
    {
      success: false,
      message: error instanceof Error ? error.message : fallback,
    },
    { status: 502 },
  );
}

/**
 * Runs the checks every social admin route shares (superadmin session, non-empty key),
 * then hands the key to `handle`.
 */
function socialRoute<P extends string>(
  { param }: RouteOptions<P>,
  handle: (request: Request, key: string) => Promise<NextResponse>,
): SocialRouteHandler<P> {
  return async (request, { params }) => {
    await connection();

    const userId = await getSessionUserId();
    if (!userId || !isSuperadmin(userId)) {
      return unauthorizedResponse(userId);
    }

    const key = decodeKey((await params)[param]);
    if (!key) {
      return NextResponse.json(
        { success: false, message: `${param} required` },
        { status: 400 },
      );
    }

    return handle(request, key);
  };
}

export function captionRoute<P extends string>(
  options: RouteOptions<P>,
): SocialRouteHandler<P> {
  const { postType, param, label } = options;
  return socialRoute(options, async (_request, key) => {
    try {
      const result = await fetchSocialCaption(postType, key);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, status: result.status, data: result.body },
          { status: upstreamStatus(result.status) },
        );
      }

      return NextResponse.json({
        success: true,
        caption: result.caption,
        facebookCaption: result.facebookCaption,
        instagramCaption: result.instagramCaption,
        [param]: key,
        postType,
      });
    } catch (error) {
      return errorResponse(error, `Error fetching ${label} caption`);
    }
  });
}

export function imageRoute<P extends string>(
  options: RouteOptions<P>,
): SocialRouteHandler<P> {
  const { postType, label } = options;
  return socialRoute(options, async (_request, key) => {
    try {
      const result = await fetchSocialImage(postType, key);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, status: result.status, data: result.body },
          { status: upstreamStatus(result.status) },
        );
      }

      return new NextResponse(result.bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      return errorResponse(error, `Error generating ${label} image`);
    }
  });
}

const markBodySchema = z
  .object({ platforms: z.array(z.string().min(1)).optional() })
  .optional();

export function markRoute<P extends string>(
  options: RouteOptions<P>,
): SocialRouteHandler<P> {
  const { postType, label } = options;
  return socialRoute(options, async (request, key) => {
    const input = await parseOptionalJsonBody(request, markBodySchema);
    if (input.response) return input.response;
    const platforms = input.data?.platforms;

    try {
      const result = await markSocialPosted(postType, key, platforms);
      return NextResponse.json(
        { success: result.ok, status: result.status, data: result.body },
        { status: result.ok ? 200 : upstreamStatus(result.status) },
      );
    } catch (error) {
      return errorResponse(error, `Error marking ${label} as posted`);
    }
  });
}

export function publishRoute<P extends string>(
  options: RouteOptions<P>,
): SocialRouteHandler<P> {
  const { postType, label } = options;
  return socialRoute(options, async (_request, key) => {
    try {
      const result = await publishSocialPost(postType, key);
      return NextResponse.json(
        { success: result.ok, status: result.status, data: result.body },
        { status: result.ok ? 200 : upstreamStatus(result.status) },
      );
    } catch (error) {
      return errorResponse(error, `Error publishing ${label}`);
    }
  });
}
