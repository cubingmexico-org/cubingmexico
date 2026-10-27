import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "year_recap",
  param: "year",
  label: "YEAR_RECAP",
});
