import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

const validEnv: Record<string, string | undefined> = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/cubing_mexico",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  WCA_CLIENT_ID: "client-id",
  WCA_CLIENT_SECRET: "client-secret",
};

describe("validateEnv", () => {
  it("accepts a complete environment", () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it("names a missing required variable", () => {
    expect(() => validateEnv({ ...validEnv, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("checks optional variables when they are set", () => {
    expect(() =>
      validateEnv({ ...validEnv, BACKEND_URL: "not a url" }),
    ).toThrow(/BACKEND_URL/);
  });

  it("rejects a short auth secret", () => {
    expect(() =>
      validateEnv({ ...validEnv, BETTER_AUTH_SECRET: "short" }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});
