import { markRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const POST = markRoute({
  postType: "year_recap",
  param: "year",
  label: "YEAR_RECAP",
});
