import { describe, expect, it } from "vitest";
import {
  IMAGE_PROXY_MAX_BYTES,
  exceedsMaxBytes,
  isAcceptableImageContentType,
  parseAllowedRedirectUrl,
  parseAllowedSourceUrl,
} from "./image-proxy-policy";

describe("parseAllowedSourceUrl", () => {
  it("accepts WCA and UploadThing hosts over https", () => {
    for (const url of [
      "https://avatars.worldcubeassociation.org/abc.jpg",
      "https://worldcubeassociation.org/rails/active_storage/blobs/x",
      "https://www.worldcubeassociation.org/x.png",
      "https://utfs.io/f/key",
      "https://abc123.ufs.sh/f/key",
    ]) {
      expect(parseAllowedSourceUrl(url)?.href).toBe(url);
    }
  });

  it("rejects http, credentials, and invalid URLs", () => {
    expect(parseAllowedSourceUrl("http://utfs.io/f/key")).toBeNull();
    expect(parseAllowedSourceUrl("https://user:pw@utfs.io/f/key")).toBeNull();
    expect(parseAllowedSourceUrl("not a url")).toBeNull();
    expect(parseAllowedSourceUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects lookalike and unlisted hosts", () => {
    expect(
      parseAllowedSourceUrl("https://evilworldcubeassociation.org/x"),
    ).toBeNull();
    expect(parseAllowedSourceUrl("https://utfs.io.evil.com/x")).toBeNull();
    expect(parseAllowedSourceUrl("https://169.254.169.254/latest")).toBeNull();
  });

  it("does not accept redirect-only hosts as a source", () => {
    expect(
      parseAllowedSourceUrl("https://bucket.s3.amazonaws.com/key"),
    ).toBeNull();
  });
});

describe("parseAllowedRedirectUrl", () => {
  const base = new URL("https://www.worldcubeassociation.org/rails/blob");

  it("accepts S3 and source hosts", () => {
    expect(
      parseAllowedRedirectUrl(
        "https://wca-assets.s3.us-west-2.amazonaws.com/key?sig=1",
        base,
      ),
    ).not.toBeNull();
    expect(
      parseAllowedRedirectUrl("https://utfs.io/f/key", base),
    ).not.toBeNull();
  });

  it("resolves relative locations against the current URL", () => {
    expect(parseAllowedRedirectUrl("/other/path", base)?.href).toBe(
      "https://www.worldcubeassociation.org/other/path",
    );
  });

  it("rejects other hosts and non-https targets", () => {
    expect(parseAllowedRedirectUrl("https://evil.com/x", base)).toBeNull();
    expect(
      parseAllowedRedirectUrl("http://bucket.s3.amazonaws.com/key", base),
    ).toBeNull();
    expect(parseAllowedRedirectUrl("http://localhost:3000/", base)).toBeNull();
  });
});

describe("isAcceptableImageContentType", () => {
  it("accepts images and octet-stream", () => {
    expect(isAcceptableImageContentType("image/png")).toBe(true);
    expect(isAcceptableImageContentType("application/octet-stream")).toBe(true);
  });

  it("rejects html and json", () => {
    expect(isAcceptableImageContentType("text/html")).toBe(false);
    expect(isAcceptableImageContentType("application/json")).toBe(false);
  });
});

describe("exceedsMaxBytes", () => {
  it("handles missing and invalid headers", () => {
    expect(exceedsMaxBytes(null)).toBe(false);
    expect(exceedsMaxBytes("abc")).toBe(false);
  });

  it("compares against the limit", () => {
    expect(exceedsMaxBytes(String(IMAGE_PROXY_MAX_BYTES))).toBe(false);
    expect(exceedsMaxBytes(String(IMAGE_PROXY_MAX_BYTES + 1))).toBe(true);
  });
});
