import { captionRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const GET = captionRoute({
  postType: "streaks_monthly",
  param: "month",
  label: "STREAKS_MONTHLY",
});
