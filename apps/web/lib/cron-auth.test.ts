import { describe, expect, it } from "vitest";
import { hasCronAuth } from "./cron-auth";

function requestWith(authorization?: string): Request {
  return new Request("https://example.com/api/revalidate", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe("hasCronAuth", () => {
  it("accepts the bearer cron secret", () => {
    expect(hasCronAuth(requestWith("Bearer s3cret"), "s3cret")).toBe(true);
    expect(hasCronAuth(requestWith("bearer s3cret"), "s3cret")).toBe(true);
  });

  it("rejects missing, malformed or wrong credentials", () => {
    expect(hasCronAuth(requestWith(), "s3cret")).toBe(false);
    expect(hasCronAuth(requestWith("s3cret"), "s3cret")).toBe(false);
    expect(hasCronAuth(requestWith("Basic s3cret"), "s3cret")).toBe(false);
    expect(hasCronAuth(requestWith("Bearer wrong!"), "s3cret")).toBe(false);
    expect(hasCronAuth(requestWith("Bearer s3cre"), "s3cret")).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    expect(hasCronAuth(requestWith("Bearer "), undefined)).toBe(false);
    expect(hasCronAuth(requestWith("Bearer anything"), undefined)).toBe(false);
  });
});
