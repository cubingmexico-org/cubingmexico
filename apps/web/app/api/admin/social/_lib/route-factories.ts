import { connection, NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { indexParamSchema, parseOptionalJsonBody } from "@/lib/route-input";
import { isSuperadmin } from "@/lib/superadmin";
import {
  type CarouselPostType,
  fetchSocialCaption,
  fetchSocialImage,
  fetchWeeklyDigestSlideImage,
  fetchWeeklyDigestSlides,
  markSocialPosted,
  publishSocialPost,
  type SocialPostType,
  typePath,
} from "@/app/(root)/admin/_lib/social";

type SocialRouteConfig = {
  postType: SocialPostType;
  /** Name the subject key goes by in responses and error messages. */
  param: string;
  /** Used in error messages, e.g. "NÉMESIS". */
  label: string;
  /** Has a single-image route (carousels without one only expose slides). */
  image: boolean;
};

type CarouselRouteConfig = SocialRouteConfig & { postType: CarouselPostType };

const CONFIGS: SocialRouteConfig[] = [
  {
    postType: "resultados",
    param: "competitionId",
    label: "RESULTADOS",
    image: true,
  },
  { postType: "record", param: "subjectKey", label: "RECORD", image: true },
  {
    postType: "upcoming",
    param: "competitionId",
    label: "UPCOMING",
    image: true,
  },
  {
    postType: "summary_unlock",
    param: "year",
    label: "SUMMARY_UNLOCK",
    image: true,
  },
  {
    postType: "weekly_digest",
    param: "week",
    label: "WEEKLY_DIGEST",
    image: true,
  },
  {
    postType: "streaks_monthly",
    param: "month",
    label: "STREAKS_MONTHLY",
    image: true,
  },
  { postType: "mollerz", param: "subjectKey", label: "MOLLERZ", image: true },
  { postType: "nemesis", param: "subjectKey", label: "NÉMESIS", image: true },
  { postType: "year_recap", param: "year", label: "YEAR_RECAP", image: false },
];

/** Post types by their URL segment (`records`, `weekly-digest`, ...). */
export const SOCIAL_ROUTES: ReadonlyMap<string, SocialRouteConfig> = new Map(
  CONFIGS.map((config) => [typePath(config.postType), config]),
);

const CAROUSEL_POST_TYPES = new Set<SocialPostType>([
  "weekly_digest",
  "year_recap",
]);

function isCarousel(config: SocialRouteConfig): config is CarouselRouteConfig {
  return CAROUSEL_POST_TYPES.has(config.postType);
}

type SocialRouteParams = { postType: string; key: string };
type SlideRouteParams = SocialRouteParams & { index: string };

type RouteContext<P> = { params: Promise<P> };

type SocialRouteHandler<P = SocialRouteParams> = (
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

function upstreamError(result: { status: number; body: unknown }) {
  return NextResponse.json(
    { success: false, status: result.status, data: result.body },
    { status: upstreamStatus(result.status) },
  );
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

function notFound(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Not found" },
    { status: 404 },
  );
}

function pngResponse(
  bytes: ArrayBuffer,
  filename: string,
  headers: Record<string, string> = {},
): NextResponse {
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/**
 * Runs the checks every social admin route shares (superadmin session, known post type that
 * supports the route, non-empty key), then hands the key and the post type's config to `handle`.
 */
function socialRoute<C extends SocialRouteConfig, P extends SocialRouteParams>(
  supports: (config: SocialRouteConfig) => config is C,
  handle: (
    request: Request,
    key: string,
    config: C,
    params: P,
  ) => Promise<NextResponse>,
): SocialRouteHandler<P> {
  return async (request, { params }) => {
    await connection();

    const userId = await getSessionUserId();
    if (!userId || !isSuperadmin(userId)) {
      return unauthorizedResponse(userId);
    }

    const resolved = await params;
    const config = SOCIAL_ROUTES.get(resolved.postType);
    if (!config || !supports(config)) return notFound();

    const key = decodeKey(resolved.key);
    if (!key) {
      return NextResponse.json(
        { success: false, message: `${config.param} required` },
        { status: 400 },
      );
    }

    return handle(request, key, config, resolved);
  };
}

const anyPostType = (config: SocialRouteConfig): config is SocialRouteConfig =>
  true;
const withImage = (config: SocialRouteConfig): config is SocialRouteConfig =>
  config.image;

export const captionRoute = socialRoute(
  anyPostType,
  async (_request, key, { postType, param, label }) => {
    try {
      const result = await fetchSocialCaption(postType, key);
      if (!result.ok) return upstreamError(result);

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
  },
);

export const imageRoute = socialRoute(
  withImage,
  async (_request, key, { postType, label }) => {
    try {
      const result = await fetchSocialImage(postType, key);
      if (!result.ok) return upstreamError(result);
      return pngResponse(result.bytes, result.filename);
    } catch (error) {
      return errorResponse(error, `Error generating ${label} image`);
    }
  },
);

const markBodySchema = z
  .object({ platforms: z.array(z.string().min(1)).optional() })
  .optional();

export const markRoute = socialRoute(
  anyPostType,
  async (request, key, { postType, label }) => {
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
  },
);

export const publishRoute = socialRoute(
  anyPostType,
  async (_request, key, { postType, label }) => {
    try {
      const result = await publishSocialPost(postType, key);
      return NextResponse.json(
        { success: result.ok, status: result.status, data: result.body },
        { status: result.ok ? 200 : upstreamStatus(result.status) },
      );
    } catch (error) {
      return errorResponse(error, `Error publishing ${label}`);
    }
  },
);

export const slidesRoute = socialRoute(
  isCarousel,
  async (_request, key, { postType, param, label }) => {
    try {
      const result = await fetchWeeklyDigestSlides(key, postType);
      if (!result.ok) return upstreamError(result);

      return NextResponse.json({
        success: true,
        count: result.count,
        slides: result.slides,
        [param]: key,
        postType,
        subjectKey: key,
      });
    } catch (error) {
      return errorResponse(error, `Error loading ${label} slides`);
    }
  },
);

export const slideImageRoute = socialRoute<
  CarouselRouteConfig,
  SlideRouteParams
>(isCarousel, async (_request, key, { postType, label }, params) => {
  const index = indexParamSchema.safeParse(params.index);
  if (!index.success) {
    return NextResponse.json(
      {
        success: false,
        message: `index: ${index.error.issues[0]?.message ?? "invalid"}`,
      },
      { status: 400 },
    );
  }

  try {
    const result = await fetchWeeklyDigestSlideImage(key, index.data, postType);
    if (!result.ok) return upstreamError(result);
    return pngResponse(result.bytes, result.filename, {
      "X-Slide-Id": result.slideId,
    });
  } catch (error) {
    return errorResponse(error, `Error generating ${label} slide image`);
  }
});
