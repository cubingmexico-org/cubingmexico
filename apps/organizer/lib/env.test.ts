import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

const validEnv: Record<string, string | undefined> = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/cubing_mexico",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
  WCA_CLIENT_ID: "client-id",
  WCA_CLIENT_SECRET: "client-secret",
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
};

describe("validateEnv", () => {
  it("accepts a complete environment", () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it("names a missing required variable", () => {
    expect(() =>
      validateEnv({ ...validEnv, NEXT_PUBLIC_APP_URL: undefined }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("accepts explicit preview module flags", () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        NEXT_PUBLIC_DESK_ENABLED: "true",
        NEXT_PUBLIC_GROUPS_ENABLED: "false",
      }),
    ).not.toThrow();
  });

  it("rejects a misspelled preview module flag", () => {
    expect(() =>
      validateEnv({ ...validEnv, NEXT_PUBLIC_GROUPS_ENABLED: "ture" }),
    ).toThrow(/NEXT_PUBLIC_GROUPS_ENABLED/);
  });

  it("checks the web URL when it is set", () => {
    expect(() =>
      validateEnv({ ...validEnv, NEXT_PUBLIC_WEB_URL: "cubingmexico" }),
    ).toThrow(/NEXT_PUBLIC_WEB_URL/);
  });
});
