import { captionRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const GET = captionRoute({
  postType: "weekly_digest",
  param: "week",
  label: "WEEKLY_DIGEST",
});
