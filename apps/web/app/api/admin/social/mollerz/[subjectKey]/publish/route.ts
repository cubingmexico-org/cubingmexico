import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "mollerz",
  param: "subjectKey",
  label: "MOLLERZ",
});
