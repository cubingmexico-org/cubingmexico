import spec from "@workspace/public-api/openapi.json";

export function GET(): Response {
  return Response.json(spec, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
