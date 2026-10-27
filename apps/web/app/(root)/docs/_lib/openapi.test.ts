import spec from "@workspace/public-api/openapi.json";
import { describe, expect, it } from "vitest";
import { baseUrl, categories, type OpenApiSpec } from "./openapi";

const publicApi = spec as unknown as OpenApiSpec;

describe("categories", () => {
  const result = categories(publicApi);
  const endpoint = (path: string) =>
    result.flatMap((c) => c.endpoints).find((e) => e.path === path);

  it("groups every path under one tab, in tag order", () => {
    expect(result.map((c) => c.label)).toEqual([
      "Competencias",
      "Personas",
      "Teams y estados",
      "Rankings y récords",
    ]);
    expect(
      result.flatMap((c) => c.endpoints.map((e) => e.path)).sort(),
    ).toEqual(Object.keys(publicApi.paths).sort());
  });

  it("builds the example request from parameter examples", () => {
    expect(endpoint("/competitions")?.curl).toBe(
      `curl "${baseUrl(publicApi)}/competitions?page=1&size=10"`,
    );
    expect(endpoint("/persons/{wca_id}")?.curl).toBe(
      `curl "${baseUrl(publicApi)}/persons/2015EXAM01"`,
    );
    expect(endpoint("/rank/{state_id}/{type}/{event_id}")?.curl).toBe(
      `curl "${baseUrl(publicApi)}/rank/CMX/single/333?page=1"`,
    );
  });

  it("resolves shared parameters and shows aliases", () => {
    const ranks = endpoint("/rank/{type}/{event_id}");
    expect(ranks?.pathParams.map((p) => p.name)).toEqual(["type", "event_id"]);
    expect(ranks?.queryParams.map((p) => p.name)).toEqual([
      "page",
      "size",
      "deprecated",
    ]);
    expect(endpoint("/competitions")?.queryParams.map((p) => p.name)).toContain(
      "stateId / state_id",
    );
  });

  it("pretty-prints the 200 example", () => {
    const states = endpoint("/states");
    expect(JSON.parse(states?.sampleResponse ?? "null")).toEqual([
      { id: "CMX", name: "Ciudad de México" },
      { id: "JAL", name: "Jalisco" },
    ]);
  });
});
