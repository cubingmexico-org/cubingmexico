import { markRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const POST = markRoute({
  postType: "mollerz",
  param: "subjectKey",
  label: "MOLLERZ",
});
