import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "summary_unlock",
  param: "year",
  label: "SUMMARY_UNLOCK",
});
