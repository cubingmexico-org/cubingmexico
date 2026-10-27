import { captionRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const GET = captionRoute({
  postType: "summary_unlock",
  param: "year",
  label: "SUMMARY_UNLOCK",
});
