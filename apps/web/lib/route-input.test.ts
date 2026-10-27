import { describe, expect, it } from "vitest";
import * as z from "zod";
import {
  indexParamSchema,
  parseJsonBody,
  parseOptionalJsonBody,
  parseParams,
  parseSearchParams,
  stateIdSchema,
} from "./route-input";

const post = (body: string) =>
  new Request("http://localhost/api/x", { method: "POST", body });

const schema = z.object({ stateId: stateIdSchema });

describe("parseJsonBody", () => {
  it("returns the parsed data", async () => {
    const input = await parseJsonBody(post('{"stateId":"JAL"}'), schema);
    expect(input).toEqual({ data: { stateId: "JAL" } });
  });

  it("rejects invalid JSON with a 400", async () => {
    const input = await parseJsonBody(post("{"), schema);
    expect(input.response?.status).toBe(400);
    expect(await input.response?.json()).toEqual({
      success: false,
      message: "Invalid JSON body",
    });
  });

  it("rejects a body that doesn't match the schema", async () => {
    for (const body of ['{"stateId":1}', '{"stateId":"XXX"}', "{}"]) {
      const input = await parseJsonBody(post(body), schema);
      expect(input.response?.status).toBe(400);
      const json = (await input.response!.json()) as { message: string };
      expect(json.message).toMatch(/^stateId: /);
    }
  });
});

describe("parseOptionalJsonBody", () => {
  const optional = z.object({ tags: z.array(z.string()) }).optional();

  it("treats an empty body as undefined", async () => {
    expect(await parseOptionalJsonBody(post(""), optional)).toEqual({
      data: undefined,
    });
  });

  it("still validates a non-empty body", async () => {
    const input = await parseOptionalJsonBody(post('{"tags":[1]}'), optional);
    expect(input.response?.status).toBe(400);
  });
});

describe("parseSearchParams", () => {
  it("validates query params", () => {
    const query = z.object({ q: z.string().min(2) });
    expect(parseSearchParams(new URLSearchParams("q=ab"), query)).toEqual({
      data: { q: "ab" },
    });
    expect(
      parseSearchParams(new URLSearchParams("q=a"), query).response?.status,
    ).toBe(400);
  });
});

describe("indexParamSchema", () => {
  const params = z.object({ index: indexParamSchema });

  it("accepts non-negative integers", () => {
    expect(parseParams({ index: "0" }, params)).toEqual({ data: { index: 0 } });
    expect(parseParams({ index: "12" }, params)).toEqual({
      data: { index: 12 },
    });
  });

  it("rejects anything else", () => {
    for (const index of ["", "-1", "1.5", "1abc", "abc"]) {
      expect(parseParams({ index }, params).response?.status).toBe(400);
    }
  });
});
