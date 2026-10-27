import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "streaks_monthly",
  param: "month",
  label: "STREAKS_MONTHLY",
});
