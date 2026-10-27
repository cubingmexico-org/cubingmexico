import { markRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const POST = markRoute({
  postType: "streaks_monthly",
  param: "month",
  label: "STREAKS_MONTHLY",
});
