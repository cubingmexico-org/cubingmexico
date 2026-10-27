import { publishRoute } from "@/app/api/admin/social/_lib/route-factories";

export const maxDuration = 120;

export const POST = publishRoute({
  postType: "resultados",
  param: "competitionId",
  label: "RESULTADOS",
});
