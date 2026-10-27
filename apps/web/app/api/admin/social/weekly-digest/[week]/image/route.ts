import { imageRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 60;

export const GET = imageRoute({
  postType: "weekly_digest",
  param: "week",
  label: "WEEKLY_DIGEST",
});
