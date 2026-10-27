import { captionRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 30;

export const GET = captionRoute({
  postType: "record",
  param: "subjectKey",
  label: "RECORD",
});
