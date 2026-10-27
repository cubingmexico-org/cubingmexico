import { imageRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 60;

export const GET = imageRoute({
  postType: "summary_unlock",
  param: "year",
  label: "SUMMARY_UNLOCK",
});
