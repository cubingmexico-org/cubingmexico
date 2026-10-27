import { describe, expect, it } from "vitest";
import { serverEnv, validateEnv } from "@/lib/env";

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

  it("requires the backend connection in production", () => {
    expect(() =>
      validateEnv({ ...validEnv, VERCEL_ENV: "production" }),
    ).toThrow(/BACKEND_URL[\s\S]*CRON_SECRET/);
    expect(() =>
      validateEnv({
        ...validEnv,
        VERCEL_ENV: "production",
        BACKEND_URL: "https://backend.example.com",
        CRON_SECRET: "secret",
      }),
    ).not.toThrow();
  });

  it("leaves the backend connection optional outside production", () => {
    expect(() =>
      validateEnv({ ...validEnv, VERCEL_ENV: "preview" }),
    ).not.toThrow();
  });

  it("checks the organizer URL when it is set", () => {
    expect(() =>
      validateEnv({ ...validEnv, NEXT_PUBLIC_ORGANIZER_URL: "organizer" }),
    ).toThrow(/NEXT_PUBLIC_ORGANIZER_URL/);
  });

  it("rejects a short auth secret", () => {
    expect(() =>
      validateEnv({ ...validEnv, BETTER_AUTH_SECRET: "short" }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("treats an empty optional variable as unset", () => {
    expect(() =>
      validateEnv({ ...validEnv, BACKEND_URL: "", CRON_SECRET: "" }),
    ).not.toThrow();
    expect(() =>
      validateEnv({ ...validEnv, VERCEL_ENV: "production", BACKEND_URL: "" }),
    ).toThrow(/BACKEND_URL/);
  });
});

describe("serverEnv", () => {
  it("returns the server variables without requiring the rest", () => {
    expect(
      serverEnv({ BACKEND_URL: "https://backend.example", CRON_SECRET: "s" }),
    ).toEqual({ BACKEND_URL: "https://backend.example", CRON_SECRET: "s" });
  });

  it("reads empty variables as unset", () => {
    expect(serverEnv({ BACKEND_URL: "", UPLOADTHING_TOKEN: "" })).toEqual({
      BACKEND_URL: undefined,
      UPLOADTHING_TOKEN: undefined,
    });
  });

  it("rejects an invalid value", () => {
    expect(() => serverEnv({ BACKEND_URL: "backend" })).toThrow(/BACKEND_URL/);
  });
});
