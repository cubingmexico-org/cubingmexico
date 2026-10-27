import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "weekly_digest",
  param: "week",
  label: "WEEKLY_DIGEST",
});
