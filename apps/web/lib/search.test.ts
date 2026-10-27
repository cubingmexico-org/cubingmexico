import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { accentInsensitiveContains, normalizeSearchText } from "./search";

function likePattern(value: string): unknown {
  const query = new PgDialect().sqlToQuery(
    accentInsensitiveContains(sql.raw("name"), value),
  );
  return query.params[0];
}

describe("normalizeSearchText", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeSearchText("México Núñez")).toBe("mexico nunez");
  });
});

describe("accentInsensitiveContains", () => {
  it("matches the normalized value anywhere", () => {
    expect(likePattern("Jalisco")).toBe("%jalisco%");
  });

  it("matches LIKE wildcards literally", () => {
    expect(likePattern("100%_cubo\\")).toBe("%100\\%\\_cubo\\\\%");
  });
});
